import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/profile.json/route";
import { getProfile, loadProfile, PROFILE_REF, profileUrl } from "@/lib/profile";

const fixture = readFileSync(new URL("./fixtures/profile.json", import.meta.url), "utf8");
const fetchMock = vi.fn<typeof fetch>();

/** The fixture with one change, as the store would send it. */
function storeFile(change: (profile: Record<string, any>) => void): Response {
  const profile = JSON.parse(fixture);
  change(profile);
  return new Response(JSON.stringify(profile), { status: 200 });
}

beforeEach(() => {
  vi.stubEnv("PROFILE_STORE_REPO", "example-owner/profile-store");
  vi.stubEnv("PROFILE_STORE_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => new Response(fixture, { status: 200 }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("profileUrl", () => {
  it("always reads the main branch", () => {
    expect(PROFILE_REF).toBe("main");
    const url = new URL(profileUrl("example-owner/profile-store"));
    expect(url.origin + url.pathname).toBe("https://api.github.com/repos/example-owner/profile-store/contents/profile.json");
    expect(url.searchParams.get("ref")).toBe("main");
  });

  it("rejects a repository that is not owner/name", () => {
    expect(() => profileUrl("example-owner")).toThrow(/owner\/name/);
    expect(() => profileUrl("example-owner/profile-store?ref=edits")).toThrow(/owner\/name/);
  });
});

describe("loadProfile", () => {
  it("requests ref=main with the token, raw media type, a timeout and hourly revalidation", async () => {
    await loadProfile();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("ref=main");
    const headers = new Headers(init?.headers);
    expect(headers.get("accept")).toBe("application/vnd.github.raw+json");
    expect(headers.get("authorization")).toBe("Bearer test-token");
    expect(headers.get("user-agent")).toBe("profile-site");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect((init as RequestInit & { next?: { revalidate?: number } }).next).toEqual({ revalidate: 3600 });
  });

  it("returns the store's JSON and the validated profile made from it", async () => {
    const { data, profile } = await loadProfile();
    expect(data).toEqual(JSON.parse(fixture));
    expect(profile.identity.name).toBe("Ada Example");
    expect(profile.experience[1]?.links).toEqual([{ label: "Product", url: "https://product.example.com/" }]);
    expect(profile.identity.provenance).toMatchObject({ sourceId: "profile-store", basis: "self-reported" });
  });

  it("throws when the token or repository is missing, without fetching", async () => {
    vi.stubEnv("PROFILE_STORE_TOKEN", "");
    await expect(loadProfile()).rejects.toThrow("PROFILE_STORE_TOKEN is not set");
    vi.stubEnv("PROFILE_STORE_TOKEN", "test-token");
    vi.stubEnv("PROFILE_STORE_REPO", "");
    await expect(loadProfile()).rejects.toThrow("PROFILE_STORE_REPO is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on a non-2xx response, with GitHub's reason", async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 }));
    await expect(loadProfile()).rejects.toThrow(/answered 401: \{"message":"Bad credentials"\}/);
  });

  it("throws on malformed JSON", async () => {
    fetchMock.mockResolvedValue(new Response("{not json", { status: 200 }));
    await expect(loadProfile()).rejects.toThrow(/did not send valid JSON/);
  });

  it("throws on a file that is not a valid profile, naming the path", async () => {
    fetchMock.mockResolvedValue(storeFile((profile) => delete profile.identity.name));
    await expect(loadProfile()).rejects.toThrow(/not a valid profile: identity\.name/);
  });

  it("throws on text that looks like contact details, without repeating it", async () => {
    fetchMock.mockResolvedValue(
      storeFile((profile) => {
        profile.experience[1].highlights.push("Call +1 555 010 0199.");
      }),
    );
    const error = await loadProfile().catch((caught: Error) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/experience\[1\]\.highlights\[2\]: Looks like a phone number/);
    expect((error as Error).message).not.toContain("555");
  });

  it("getProfile returns only the profile", async () => {
    expect((await getProfile()).identity.name).toBe("Ada Example");
  });
});

describe("GET /profile.json", () => {
  it("serves the store's JSON once it passed the checks, with shared-cache headers", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(JSON.parse(await response.text())).toEqual(JSON.parse(fixture));
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
  });

  it("fails rather than serving an error body as the profile", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    await expect(GET()).rejects.toThrow("404");
  });

  it("fails rather than serving a file with contact details", async () => {
    fetchMock.mockResolvedValue(storeFile((profile) => (profile.identity.summary = "Mail ada@example.com")));
    await expect(GET()).rejects.toThrow(/identity\.summary: Looks like an email address/);
  });
});
