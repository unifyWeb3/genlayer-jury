import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JuryProvider } from "@/lib/JuryContext";
import { ModeProvider } from "@/lib/ModeContext";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Jury - When code can't decide, five AIs can.",
  description:
    "An interactive demonstration of GenLayer's Equivalence Principle. Pose a subjective question, watch five LLMs deliberate as validators, see the verdict — live in your browser.",
  metadataBase: new URL("https://genlayer-jury.vercel.app"),
  openGraph: {
    title: "The Jury — Court of the Internet",
    description:
      "Smart contracts move money. Intelligent Contracts decide who deserves it.",
    url: "https://genlayer-jury.vercel.app",
    siteName: "The Jury",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Jury — Court of the Internet",
    description:
      "Smart contracts move money. Intelligent Contracts decide who deserves it.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin=""
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ModeProvider>
          <JuryProvider>{children}</JuryProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
