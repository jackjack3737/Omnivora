import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omnivora",
  description: "Piattaforma per obiettivi macro, storico pasti e laboratorio ingredienti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="bg-[#09090b] text-[#fafafa]">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#09090b] text-[#fafafa]`}>
        {children}
      </body>
    </html>
  );
}
