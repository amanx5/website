import "server-only";
import type { ProfileInput } from "@promptfolio/core";

/**
 * The store's validated branch. A constant on purpose: without `?ref=`, GitHub serves the
 * default branch (`edits`), which holds unvalidated edits.
 */
export const PROFILE_REF = "main";

/** How long (seconds) a fetched profile is reused before Next.js fetches it again in the background. */
export const PROFILE_REVALIDATE_SECONDS = 3600;

const REPO_PATTERN = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

/** GitHub contents API URL for `profile.json` at {@link PROFILE_REF} in `repo` (`owner/name`). */
export function profileUrl(repo: string): string {
  if (!REPO_PATTERN.test(repo)) {
    throw new Error(`PROFILE_STORE_REPO must look like "owner/name", got "${repo}"`);
  }
  return `https://api.github.com/repos/${repo}/contents/profile.json?ref=${PROFILE_REF}`;
}

/**
 * Fetches `profile.json` as text. The JSON is not validated here: the store's CI is the only
 * validation. Every failure throws, so Next.js keeps serving the last good page and data
 * instead of caching an error (it caches only 200 responses).
 */
export async function fetchProfileText(): Promise<string> {
  const repo = process.env.PROFILE_STORE_REPO;
  const token = process.env.PROFILE_STORE_TOKEN;
  if (!repo) throw new Error("PROFILE_STORE_REPO is not set");
  if (!token) throw new Error("PROFILE_STORE_TOKEN is not set");

  const response = await fetch(profileUrl(repo), {
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: PROFILE_REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`Fetching profile.json failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  JSON.parse(text); // a malformed file throws here rather than being served
  return text;
}

/** The profile, parsed and trusted as `ProfileInput`. */
export async function getProfile(): Promise<ProfileInput> {
  return JSON.parse(await fetchProfileText()) as ProfileInput;
}
