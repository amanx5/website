import { fetchProfileText } from "@/lib/profile";

// Must be a literal for Next.js to read it; keep in step with PROFILE_REVALIDATE_SECONDS.
export const revalidate = 3600;

/** The store's `profile.json`, byte for byte, for the chat app and other readers. */
export async function GET(): Promise<Response> {
  const body = await fetchProfileText();
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
