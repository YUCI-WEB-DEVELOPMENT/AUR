import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "./lib/site";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const SITE_TITLE = "Asia University Rankings | Premium Institutional Portal";
const SITE_DESCRIPTION =
  "Comprehensive editorial rankings and comparisons of top universities across Asia, built for international scholars and medical students.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Asia University Rankings",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  verification: {
    google: "YwB-jm28RtR5Rl3PR-aEUAhGhq0TCx6qZ8IeVgrU8RI",
  },
  keywords: [
    "Asia university rankings",
    "university comparison",
    "study in Asia",
    "higher education",
    "medical universities Central Asia",
  ],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Asia University Rankings",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-card.png",
        width: 1200,
        height: 630,
        alt: "Asia University Rankings — Asia's most trusted university intelligence platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-card.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Asia University Rankings",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: SITE_DESCRIPTION,
  sameAs: [
    "https://www.linkedin.com/company/asia-university-rankings/",
    "https://www.instagram.com/asiauniversityrankings/",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,   // allow pinch-zoom on mobile (accessibility)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfb" },
    { media: "(prefers-color-scheme: dark)",  color: "#060609" },
  ],
};

const stripExtensionHydrationAttrs = `
(() => {
  const attr = "fdprocessedid";
  const strip = (root = document) => {
    root.querySelectorAll?.("[" + attr + "]").forEach((node) => {
      node.removeAttribute(attr);
    });
  };

  strip();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        mutation.target.removeAttribute(attr);
      }
    }
  }).observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: [attr],
  });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn("h-full", "antialiased", playfair.variable, "font-sans", inter.variable)}
      style={{ overscrollBehaviorY: "none" }}
    >
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesque@800,500,700,400,300,900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)]" style={{ overscrollBehavior: "none" }}>
        {process.env.NODE_ENV === "development" && (
          <Script
            id="strip-extension-hydration-attrs"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: stripExtensionHydrationAttrs }}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
