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
  title: "KODAnnai",
  description: "KODAIRA祭 経路案内アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KODAnnai",
  },
  openGraph: {
    title: "KODAnnai",
    description: "KODAIRA祭 経路案内アプリ",
    url: "https://kodannai.vercel.app",
    siteName: "KODAnnai",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KODAnnai",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KODAnnai",
    description: "KODAIRA祭 経路案内アプリ",
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
        <meta name="apple-mobile-web-app-title" content="KODAnnai" />
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
