import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingActionStack from "@/components/FloatingActionStack"; // ✅ unified stack

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodXchange",
  description: "Connecting buyers and manufacturers in the Israeli market",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-screen flex flex-col font-sans antialiased">

        {/* ✅ HEADER */}
        <Header />

        {/* ✅ MAIN */}
        <main className="flex-1">
          {children}
        </main>

        {/* ✅ FOOTER */}
        <Footer />

        {/* ✅ ✅ UNIFIED FLOATING STACK (WhatsApp + Accessibility) */}
        <FloatingActionStack />

      </body>
    </html>
  );
}
