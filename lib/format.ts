import type { ExternalLink, PartialDate, RoleInput } from "@promptfolio/core";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `"2025-11"` → `"Nov 2025"`, `"2025"` → `"2025"`. */
export function formatPartialDate(date: PartialDate): string {
  const [year, month] = date.split("-");
  const name = month ? MONTHS[Number(month) - 1] : undefined;
  return name ? `${name} ${year}` : (year ?? date);
}

/** `"Nov 2025 – Present"` when `end` is absent. */
export function formatDateRange(start: PartialDate, end?: PartialDate): string {
  return `${formatPartialDate(start)} – ${end ? formatPartialDate(end) : "Present"}`;
}

/** "Title, Organization", unless the title already names the organization. */
export function roleHeading(role: Pick<RoleInput, "title" | "organization">): string {
  return role.title.toLowerCase().includes(role.organization.toLowerCase())
    ? role.title
    : `${role.title}, ${role.organization}`;
}

/**
 * Turns the `CHAT_URL` env var into an absolute URL. A value without a scheme
 * (`chat.example.com`) gets `https://`, since a bare host would be a relative link. Anything
 * that is not an http(s) URL throws, so a bad value fails the build instead of shipping a broken
 * link.
 */
export function absoluteUrl(value: string): string {
  const trimmed = value.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`CHAT_URL is not a valid URL: "${value}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`CHAT_URL must use http or https: "${value}"`);
  }
  return url.href;
}

/**
 * Chat first when `chatUrl` is set (from the `CHAT_URL` env var), then the profile's links in
 * order, minus the link to this website.
 */
export function headerLinks(links: ExternalLink[] = [], chatUrl?: string): ExternalLink[] {
  const chat: ExternalLink[] = chatUrl?.trim() ? [{ label: "Chat", url: absoluteUrl(chatUrl) }] : [];
  return [...chat, ...links.filter((link) => link.label !== "Website")];
}
