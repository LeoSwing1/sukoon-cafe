import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sukoon Diaries | A little pause. A little sukoon.",
    template: "%s | Sukoon Diaries",
  },
  description: "Explore the Sukoon Cafe experience in Lucknow. Browse our digital menu, order online, reserve a table, plan a celebration or enquire about catering.",
  applicationName: "Sukoon Diaries",
  keywords: ["Sukoon Cafe", "Sukoon Diaries", "Cafe in Lucknow", "Cafe menu", "Table reservation", "Party booking", "Catering"],
  openGraph: {
    title: "Sukoon Diaries | A little pause. A little sukoon.",
    description: "Good food, warm moments and a little time for yourself in Lucknow.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
