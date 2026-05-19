import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/ui/Footer";
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

  openGraph: {
    type: "website",
    url: baseUrl,
    siteName: "FoodXchange",
    title: "FoodXchange",
    description:
      "Global sourcing platform connecting manufacturers with Israeli retail.",
    images: [
      {
        url: "/og-default.png", // ✅ add later in /public
        width: 1200,
        height: 630,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "FoodXchange",
    description:
      "Food sourcing insights, supplier discovery, and market opportunities.",
    images: ["/og-default.png"],
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
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}