import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://kodannai.vercel.app"),
  title: "KODAIRA祭公式サイト",
  description: "KODAIRA祭の企画マップ・団体紹介・タイムテーブル・経路案内（KODAnnai）",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KODAIRA祭",
  },
  openGraph: {
    title: "KODAIRA祭公式サイト",
    description: "KODAIRA祭の企画マップ・団体紹介・タイムテーブル・経路案内（KODAnnai）",
    url: "https://kodannai.vercel.app",
    siteName: "KODAIRA祭公式サイト",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KODAIRA祭公式サイト",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KODAIRA祭公式サイト",
    description: "KODAIRA祭の企画マップ・団体紹介・タイムテーブル・経路案内（KODAnnai）",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="KODAIRA祭" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
