import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

// Newsreader is only rendered on the landing page (.font-serif-editorial), so
// skip the route-wide preload; it still loads via CSS where it's used.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://playsync.fun").replace(/\/+$/, "");
const enableVercelInsights =
  process.env.VERCEL === "1" ||
  process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "1";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  applicationName: "PlaySync",
  title: "Pickleball Open Play & Round Robin App | PlaySync",
  description:
    "Run pickleball open play & round robins from one link. Players scan a QR to follow live scores and standings, the next game posts itself, and rotations stay fair. No app to install, no group texts.",
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
    title: "PlaySync - Play more. Organize less.",
    description:
      "Run pickleball open play & round robins from one link. Players scan a QR to follow live scores and standings, the next game posts itself, and rotations stay fair. No app to install, no group texts.",
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
    title: "PlaySync - Play more. Organize less.",
    description:
      "Run pickleball open play & round robins from one link. Players scan a QR to follow live scores and standings, the next game posts itself, and rotations stay fair. No app to install, no group texts.",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable}`}
    >
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
