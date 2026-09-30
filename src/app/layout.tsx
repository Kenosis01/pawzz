import "~/styles/global.css";
// KaTeX ships its own stylesheet and its own fonts. Imported here, once, rather
// than inside the markdown component: a global stylesheet imported from a
// component is injected per mount, and this one is ~23 kB of rules plus webfont
// faces that the transcript needs exactly once.
import "katex/dist/katex.min.css";

import { type Metadata, type Viewport } from "next";
import {
  Cormorant_Garamond,
  Geist,
  Source_Serif_4,
} from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

/**
 * The editorial face: the Pawzz title, the greeting, and assistant replies.
 *
 * Subsets and self-hosts at build time, which is why there is no hand-placed
 * woff2 any more.
 *
 * The weights are the whole reason this list is not just `["500"]`. A weight the
 * loader does not have gets *synthesised* by the browser, or silently dropped in
 * favour of a different family — and a reply contains bold runs, so
 * `font-weight: 600` inside a paragraph was rendering in whatever sans the system
 * could offer while the words around it stayed serif. That reads as a rendering
 * bug rather than as emphasis, and it is most visible exactly where it matters
 * most: the opening phrase of every list item.
 *
 * 300 is the greeting's display cut, 500 the title and body, and 600/700 are
 * loaded purely so bold has a real face to use. 400 is loaded too because 500
 * alone leaves italic synthesised for any emphasis written that way.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/**
 * The face replies are set in.
 *
 * Source Serif 4 rather than the Cormorant above. The editorial face is a display
 * cut — drawn for a wordmark and a single line — and it thins out fast below
 * about 24px. At reading size across a few hundred words its thin strokes close
 * up and the reply looks like a scan rather than something written. Source Serif
 * 4 was drawn for body text: a sturdier colour, a taller x-height, and an italic
 * with enough weight to stay legible beside the roman.
 *
 * Weights are listed rather than left variable, for the reason the block above
 * now spells out: an unlisted weight is synthesised, and a synthesised bold is a
 * different typeface.
 */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-response",
  display: "swap",
});

/**
 * The theme is resolved before first paint by the same inline script the
 * desktop build used in index.html. Without it the window flashes the wrong
 * surface on load, and the flash is the whole reason it is inline rather than an
 * effect.
 *
 * Mirrors src/lib/theme.ts — if one changes, change both.
 */
const THEME_BOOTSTRAP = `(function () {
  try {
    var stored = localStorage.getItem("pawzz.theme");
    var dark =
      stored === "dark" ||
      (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (error) {
    document.documentElement.classList.toggle(
      "dark",
      matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }
})();`;

export const metadata: Metadata = {
  title: "Pawzz",
  description: "A quiet place to think out loud.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b19" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the bootstrap above mutates the class before
    // React takes over, which it cannot know about.
    <html
      lang="en"
      className={`${geist.variable} ${cormorant.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
