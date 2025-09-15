import type { Metadata } from "next";
import { Creepster, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const creepster = Creepster({
  variable: "--font-creepster",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spook — Horror Hacks",
  description: "A spooky game built with Next.js for Horror Hacks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${creepster.variable} antialiased bg-gradient-to-b from-[#0b0b10] via-black to-[#0b0b10] text-[#ededed]`}
      >
        {children}
      </body>
    </html>
  );
}
