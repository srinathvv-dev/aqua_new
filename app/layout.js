import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "../styles/globals.css";

// Load custom fonts with better performance settings
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap", // Ensure text remains visible during webfont load
  adjustFontFallback: false, // Disable fallback font to prevent layout shift
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
});

// Enhanced metadata with Open Graph and Twitter cards
export const metadata = {
  title: {
    default: "AQUA | Underwater Vehicle Analysis",
    template: "%s | AQUA"
  },
  description: "Advanced monitoring and control system for underwater robotics",
  metadataBase: new URL("https://aqua.example.com"), // Replace with your actual URL
  applicationName: "AQUA Robotics",
  keywords: ["underwater", "ROV", "robotics", "sensors", "oceanography"],
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  creator: "Srinath V V",
  publisher: "CSIR-CMERI: Central Mechanical Engineering Research Institute",

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "AQUA | Underwater Vehicle Analysis",
    description: "Advanced monitoring and control system for underwater robotics",
    url: "https://aqua.example.com",
    siteName: "AQUA",
    images: [
      {
        url: "/images/og-image.png", // Replace with your Open Graph image
        width: 1200,
        height: 630,
        alt: "AQUA Underwater Robotics Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AQUA | Underwater Vehicle Analysis",
    description: "Advanced monitoring and control system for underwater robotics",
    images: ["/images/twitter-image.png"], // Replace with your Twitter image
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/images/wave.png", type: "image/png", sizes: "32x32" },
      { url: "/images/wave.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [
      { url: "/images/apple-touch-icon.png", sizes: "180x180" }, // Recommended for iOS
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/images/safari-pinned-tab.svg",
        color: "#00a8ff", // Your brand color
      },
    ],
  },
  manifest: "/site.webmanifest", // Recommended for PWA
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/fonts/GeistVF.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/GeistMonoVF.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-gray-950 text-gray-100 selection:bg-blue-600/30 selection:text-blue-200`}
        suppressHydrationWarning
      >
        {children}
        {/* Add performance monitoring */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}