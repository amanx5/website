import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const fixture = readFileSync(new URL("./fixtures/profile.json", import.meta.url), "utf8");

beforeEach(() => {
  vi.stubEnv("PROFILE_STORE_REPO", "example-owner/profile-store");
  vi.stubEnv("PROFILE_STORE_TOKEN", "test-token");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(fixture, { status: 200 })));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function renderHome(): Promise<string> {
  return renderToStaticMarkup(await Home());
}

describe("home page", () => {
  it("renders identity, header links, roles and projects from the profile", async () => {
    vi.stubEnv("CHAT_URL", "https://chat.example.com/");
    const html = await renderHome();
    expect(html).toContain("<h1>Ada Example</h1>");
    expect(html).toContain("Software Engineer · Example City");
    expect(html).toContain('href="https://chat.example.com/"');
    expect(html).toContain('href="https://github.example.com/ada"');
    expect(html).not.toContain('href="https://www.example.com/"');
    expect(html).toContain("Independent Software Engineer</h3>");
    expect(html).toContain("Software Engineer, Example Corp</h3>");
    expect(html).toContain("Nov 2025 – Present");
    expect(html).toContain("Jan 2024 – Oct 2025");
    expect(html).toContain("<li>Built a reporting dashboard.</li>");
    expect(html).toContain('href="https://product.example.com/"');
    expect(html).toContain("<h3>First Project</h3>");
    expect(html).toContain("<h3>Second Project</h3>");
  });

  it("leaves out the Chat link when CHAT_URL is unset", async () => {
    expect(await renderHome()).not.toContain(">Chat</a>");
  });

  it("does not render a mailto link", async () => {
    expect(await renderHome()).not.toContain("mailto:");
  });
});
