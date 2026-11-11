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
 * Chat first when `chatUrl` is set (from the `CHAT_URL` env var), then the profile's links in
 * order, minus the link to this website.
 */
export function headerLinks(links: ExternalLink[] = [], chatUrl?: string): ExternalLink[] {
  const chat: ExternalLink[] = chatUrl ? [{ label: "Chat", url: chatUrl }] : [];
  return [...chat, ...links.filter((link) => link.label !== "Website")];
}
