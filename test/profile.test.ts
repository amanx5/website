import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/profile.json/route";
import { fetchProfileText, getProfile, PROFILE_REF, profileUrl } from "@/lib/profile";

const fixture = readFileSync(new URL("./fixtures/profile.json", import.meta.url), "utf8");
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("PROFILE_STORE_REPO", "example-owner/profile-store");
  vi.stubEnv("PROFILE_STORE_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(fixture, { status: 200 }));
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

describe("fetchProfileText", () => {
  it("requests ref=main with the token, raw media type and hourly revalidation", async () => {
    await fetchProfileText();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("ref=main");
    expect(init?.headers).toMatchObject({
      Accept: "application/vnd.github.raw+json",
      Authorization: "Bearer test-token",
    });
    expect((init as RequestInit & { next?: { revalidate?: number } }).next).toEqual({ revalidate: 3600 });
  });

  it("returns the file text unchanged", async () => {
    await expect(fetchProfileText()).resolves.toBe(fixture);
  });

  it("throws when the token or repository is missing, without fetching", async () => {
    vi.stubEnv("PROFILE_STORE_TOKEN", "");
    await expect(fetchProfileText()).rejects.toThrow("PROFILE_STORE_TOKEN is not set");
    vi.stubEnv("PROFILE_STORE_TOKEN", "test-token");
    vi.stubEnv("PROFILE_STORE_REPO", "");
    await expect(fetchProfileText()).rejects.toThrow("PROFILE_STORE_REPO is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(new Response("Bad credentials", { status: 401, statusText: "Unauthorized" }));
    await expect(fetchProfileText()).rejects.toThrow("401");
  });

  it("throws on malformed JSON", async () => {
    fetchMock.mockResolvedValue(new Response("{not json", { status: 200 }));
    await expect(fetchProfileText()).rejects.toThrow(SyntaxError);
  });
});

describe("getProfile", () => {
  it("parses the profile", async () => {
    const profile = await getProfile();
    expect(profile.schemaVersion).toBe(1);
    expect(profile.identity.name).toBe("Ada Example");
  });
});

describe("GET /profile.json", () => {
  it("serves the store's file as is, with shared-cache headers", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(fixture);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
  });

  it("fails rather than serving an error body as the profile", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404, statusText: "Not Found" }));
    await expect(GET()).rejects.toThrow("404");
  });
});
