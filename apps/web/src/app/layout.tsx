import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sukoon Cafe | Sukoon Diaries",
  description: "Your daily dose of warmth and quiet moments."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
