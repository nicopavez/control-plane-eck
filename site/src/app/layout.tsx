import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Control Plane for ECK",
  description: "Install analysis and an API-first prototype for Elastic Cloud on Kubernetes.",
};

// Applies a stored theme before hydration so there is no flash of the wrong
// theme; it only ever reads a value this same app wrote to localStorage.
const THEME_SCRIPT = `(function(){try{var t=window.localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SampleDataBanner />
        <header className="site-header">
          <p className="site-title">Control Plane for ECK</p>
          <ThemeToggle />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
