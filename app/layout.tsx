import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getProfile } from "@/lib/profile";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { identity } = await getProfile();
  return {
    title: identity.name,
    description: identity.summary,
    // The chat app links to these paths too, so keep them stable.
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32" },
        { url: "/icon.png", type: "image/png", sizes: "96x96" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
