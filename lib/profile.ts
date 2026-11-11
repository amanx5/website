import "server-only";
import { findContactDetails, loadStructuredProfile, type Profile, type ProfileIssue } from "@promptfolio/core";
import { fetchRemoteProfile } from "@promptfolio/source-remote";

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

/** The store's file as parsed JSON, and the validated profile made from it. */
export interface LoadedProfile {
  data: unknown;
  profile: Profile;
}

/**
 * Fetches `profile.json` from the store and checks it again here, as a second line of defence
 * behind the store's CI: it must be a valid profile, and no text may look like contact details.
 *
 * Every failure throws, so Next.js keeps serving the last good page and data instead of caching an
 * error (its data cache keeps only 200 responses, and a failed revalidation keeps the stale page).
 */
export async function loadProfile(): Promise<LoadedProfile> {
  const repo = process.env.PROFILE_STORE_REPO;
  const token = process.env.PROFILE_STORE_TOKEN;
  if (!repo) throw new Error("PROFILE_STORE_REPO is not set");
  if (!token) throw new Error("PROFILE_STORE_TOKEN is not set");

  const fetched = await fetchRemoteProfile({
    url: profileUrl(repo),
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    userAgent: "profile-site",
    // Adds Next.js's data cache to the package's request; the package sets the headers and signal.
    fetch: (input, init) =>
      fetch(input, { ...init, next: { revalidate: PROFILE_REVALIDATE_SECONDS } }),
  });
  if (!fetched.ok) throw new Error(`Fetching profile.json failed: ${fetched.error.message}`);

  const loaded = loadStructuredProfile(fetched.data, {
    sourceId: "profile-store",
    label: "Profile store",
    observedAt: fetched.fetchedAt,
  });
  if (!loaded.ok) throw new Error(`profile.json is not a valid profile: ${describe(loaded.issues)}`);

  const contact = findContactDetails(fetched.data);
  if (contact.length > 0) {
    throw new Error(`profile.json has text that looks like contact details: ${describe(contact)}`);
  }

  return { data: fetched.data, profile: loaded.profile };
}

/** The validated profile. */
export async function getProfile(): Promise<Profile> {
  return (await loadProfile()).profile;
}

/** Paths and messages only: an issue never repeats the text it found. */
function describe(issues: ProfileIssue[]): string {
  return issues.map((issue) => `${issue.path || "(root)"}: ${issue.message}`).join("; ");
}
