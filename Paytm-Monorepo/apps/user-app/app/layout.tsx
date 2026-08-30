/**
 * app/layout.tsx  (Root Layout)
 *
 * This is the top-level layout for the entire Next.js application.
 * Every page rendered by the app is wrapped inside this component.
 *
 * Responsibilities:
 * - Sets global HTML metadata (page title, description) used by search engines.
 * - Loads the Inter font from Google Fonts and applies it as the default body font.
 * - Injects the global CSS styles (globals.css).
 * - Wraps the app in <Providers> so that Recoil state & NextAuth session are
 *   available throughout the component tree.
 * - Renders <AppbarClient> (the top navigation bar) on every page.
 * - Renders {children}, which is the currently active page/route.
 *
 * The outer <div> sets a minimum full-screen size and a light pinkish-gray
 * background colour (#ebe6e6) for the entire app.
 */
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "../provider";
import { AppbarClient } from "../components/AppbarClient";

// Load Inter font with latin character subset.
// next/font automatically optimises and self-hosts the font.
const inter = Inter({ subsets: ["latin"] });

/**
 * SEO metadata exported for Next.js to inject into the <head> tag.
 * - title: shown in the browser tab and search results
 * - description: meta description used by search engines
 */
export const metadata: Metadata = {
  title: "Wallet",
  description: "Simple wallet app",
};

/**
 * RootLayout
 *
 * The mandatory root layout component for the App Router.
 * Must return an <html> element wrapping a <body>.
 *
 * @param children - The active page component resolved by Next.js routing
 * @returns JSX.Element - The full HTML document shell
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      {/* Providers injects RecoilRoot + SessionProvider for global state & auth */}
      <Providers>
        {/* inter.className applies the Inter font via CSS variable */}
        <body className={inter.className}>
          {/* Full-screen container with light background colour */}
          <div className="min-w-screen min-h-screen bg-[#ebe6e6]">
            {/* Global top navigation bar (sign-in / sign-out buttons, user info) */}
            <AppbarClient />
            {/* Active page content is rendered here */}
            {children}
          </div>
        </body>
      </Providers>
    </html>
  );
}
