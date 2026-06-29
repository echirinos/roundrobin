import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playsync.app";
const enableVercelInsights =
  process.env.VERCEL === "1" ||
  process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "1";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  applicationName: "PlaySync",
  title: "PlaySync - Run open play. Skip group texts.",
  description:
    "Create a live pickleball session, share a QR code, post the next game, and collect courtside scores from one mobile-friendly link.",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: "PlaySync",
    statusBarStyle: "default",
  },
  category: "sports",
  creator: "PlaySync",
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  publisher: "PlaySync",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  keywords: [
    "pickleball",
    "open play",
    "round robin",
    "rotating partners",
    "court assignments",
    "score tracker",
  ],
  openGraph: {
    title: "PlaySync - Run open play. Skip group texts.",
    description:
      "Create a live pickleball session, share a QR code, post the next game, and collect scores from one mobile-friendly link.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PlaySync live pickleball session preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaySync - Run open play. Skip group texts.",
    description:
      "Create a live pickleball session, share a QR code, post the next game, and collect scores from one mobile-friendly link.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbef" },
    { media: "(prefers-color-scheme: dark)", color: "#162119" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <AnalyticsProvider />
          {enableVercelInsights && (
            <>
              <Analytics />
              <SpeedInsights />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
