import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../../public/fonts/satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/satoshi-700.woff2", weight: "700", style: "normal" },
  ],
});

const cabinet = localFont({
  variable: "--font-cabinet",
  display: "swap",
  src: [
    { path: "../../public/fonts/cabinet-grotesk-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/cabinet-grotesk-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/cabinet-grotesk-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/cabinet-grotesk-800.woff2", weight: "800", style: "normal" },
  ],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pusat Akun · Maubisa",
  description:
    "Kelola profil, langganan, akses, dan riwayat pembayaran akun Maubisa kamu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${satoshi.variable} ${cabinet.variable} ${mono.variable}`}>
      <body className="min-h-[100dvh] font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
