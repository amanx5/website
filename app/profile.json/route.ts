import { loadProfile } from "@/lib/profile";

// Must be a literal for Next.js to read it; keep in step with PROFILE_REVALIDATE_SECONDS.
export const revalidate = 3600;

/**
 * The store's `profile.json`, for the chat app and other readers: the same JSON, once it has passed
 * the checks in `loadProfile`. Re-serialized, so whitespace can differ from the file.
 */
export async function GET(): Promise<Response> {
  const { data } = await loadProfile();
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
