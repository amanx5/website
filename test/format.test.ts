import { describe, expect, it } from "vitest";
import { absoluteUrl, formatDateRange, formatPartialDate, headerLinks, roleHeading } from "@/lib/format";

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

  it("makes a chat URL without a scheme absolute", () => {
    expect(headerLinks([], "chat.example.com")).toEqual([chat]);
    expect(headerLinks([], "  chat.example.com/  ")).toEqual([chat]);
  });
});

describe("absoluteUrl", () => {
  it("keeps an http(s) URL", () => {
    expect(absoluteUrl("https://chat.example.com/x")).toBe("https://chat.example.com/x");
    expect(absoluteUrl("http://localhost:3001")).toBe("http://localhost:3001/");
  });

  it("rejects values that are not web URLs", () => {
    expect(() => absoluteUrl("ftp://chat.example.com")).toThrow(/http or https/);
    expect(() => absoluteUrl("javascript:alert(1)")).toThrow(/CHAT_URL/);
    expect(() => absoluteUrl("not a url")).toThrow(/not a valid URL/);
  });
});
