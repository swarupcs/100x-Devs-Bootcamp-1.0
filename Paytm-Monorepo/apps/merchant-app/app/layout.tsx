/**
 * apps/merchant-app/app/layout.tsx  (Root Layout — Merchant App)
 *
 * The top-level layout for the merchant-app Next.js application.
 * Every merchant page is rendered inside this component.
 *
 * Responsibilities:
 * - Sets page metadata (title: "Merchant App") for SEO and browser tabs.
 * - Loads and applies the Inter Google Font across the app.
 * - Wraps the page tree with <Providers> so all child components have access
 *   to Recoil global state and the NextAuth session.
 * - Renders {children} — the currently active merchant page/route.
 *
 * Key difference from user-app layout:
 *  The merchant-app layout does NOT include a global <AppbarClient /> because
 *  the appbar is rendered directly on the page level (app/page.tsx) instead.
 */
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "../provider";

// Initialise the Inter font with the latin character subset.
// Next.js automatically optimises and self-hosts the font.
const inter = Inter({ subsets: ["latin"] });

/**
 * SEO metadata injected into the <head> tag by Next.js.
 * - title: shown in browser tab and search engine results
 * - description: used as the meta description
 */
export const metadata: Metadata = {
  title: "Merchant App",
  description: "Merchant wallet app",
};

/**
 * RootLayout (Merchant App)
 *
 * Mandatory root layout for the Next.js App Router.
 * Must return an <html> element containing a <body>.
 *
 * @param children - The active merchant page component
 * @returns JSX.Element - The full HTML document shell
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      {/* Providers supplies RecoilRoot + SessionProvider to the entire app */}
      <Providers>
        {/* inter.className applies the loaded Google Font to all text */}
        <body className={inter.className}>{children}</body>
      </Providers>
    </html>
  );
}
