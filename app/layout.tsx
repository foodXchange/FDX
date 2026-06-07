import type { Metadata } from "next";
import "./globals.css";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),

  title: {
    default: "FoodXchange | Global Food Sourcing Platform",
    template: "%s | FoodXchange",
  },

  description:
    "FoodXchange connects global food manufacturers with Israeli retailers. Sourcing insights, supplier discovery, and private label opportunities.",

  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  openGraph: {
    type: "website",
    url: baseUrl,
    siteName: "FoodXchange",
    title: "FoodXchange",
    description:
      "Global sourcing platform connecting manufacturers with Israeli retail.",
    images: [
      {
        url: "/logo-square.png",
        width: 1024,
        height: 1024,
        alt: "FoodXchange",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "FoodXchange",
    description:
      "Food sourcing insights, supplier discovery, and market opportunities.",
    images: ["/logo-square.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}