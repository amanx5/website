import { describe, expect, it } from "vitest";
import { formatDateRange, formatPartialDate, headerLinks, roleHeading } from "@/lib/format";

describe("formatPartialDate", () => {
  it("formats YYYY-MM as a short month and year", () => {
    expect(formatPartialDate("2025-11")).toBe("Nov 2025");
    expect(formatPartialDate("2024-01")).toBe("Jan 2024");
  });

  it("keeps a bare year", () => {
    expect(formatPartialDate("2023")).toBe("2023");
  });
});

describe("formatDateRange", () => {
  it("joins start and end with an en dash", () => {
    expect(formatDateRange("2024-01", "2025-10")).toBe("Jan 2024 – Oct 2025");
  });

  it("says Present when there is no end", () => {
    expect(formatDateRange("2025-11")).toBe("Nov 2025 – Present");
  });
});

describe("roleHeading", () => {
  it("appends the organization", () => {
    expect(roleHeading({ title: "Software Engineer", organization: "Example Corp" })).toBe(
      "Software Engineer, Example Corp",
    );
  });

  it("does not repeat an organization the title already names", () => {
    expect(roleHeading({ title: "Independent Software Engineer", organization: "Independent" })).toBe(
      "Independent Software Engineer",
    );
  });
});

describe("headerLinks", () => {
  const chatUrl = "https://chat.example.com/";
  const chat = { label: "Chat", url: chatUrl };
  const github = { label: "GitHub", url: "https://github.example.com/ada" };
  const website = { label: "Website", url: "https://www.example.com/" };

  it("puts Chat first and drops the link to this website", () => {
    expect(headerLinks([website, github], chatUrl)).toEqual([chat, github]);
  });

  it("leaves Chat out when no chat URL is configured", () => {
    expect(headerLinks([website, github])).toEqual([github]);
    expect(headerLinks([github], "")).toEqual([github]);
  });

  it("shows Chat alone when the profile has no links", () => {
    expect(headerLinks(undefined, chatUrl)).toEqual([chat]);
  });
});
