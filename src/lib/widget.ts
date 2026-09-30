/**
 * Widgets: the shape of a rendered visual, and the document that renders it.
 *
 * The model never draws anything. It calls `show_widget` with a code fragment and
 * this module is the thing that turns that fragment into something a person can
 * look at: a full HTML document, built here, run in an iframe that has no same
 * origin as the app.
 *
 * Two rules govern everything below, and both come from how a sandbox actually
 * behaves rather than from preference:
 *
 * 1. The iframe is `sandbox="allow-scripts"` and nothing else. Without
 *    `allow-same-origin` the document is on an opaque origin, so a widget cannot
 *    reach this app's cookies, localStorage, or DOM no matter what code the model
 *    produced. Adding that attribute would hand every generated widget the app's
 *    entire session.
 * 2. Everything a widget loads comes from a short allowlist, enforced by a
 *    Content-Security-Policy in the document head. A widget that reaches for
 *    another origin does not error loudly — it silently does nothing — which is
 *    why the allowlist is written out in the system prompt as a list the model is
 *    meant to read rather than discover.
 */

/** The tool name, used as the key in the SDK's tool map and in the prompt. */
export const WIDGET_TOOL = "show_widget";

/**
 * A widget as it is stored on a message.
 *
 * Stored rather than re-derived from the stream so a widget still renders after
 * a reload. `id` is the model's tool-call id, which is what makes two widgets
 * distinguishable in the transcript even when both are titled "chart".
 */
export type MessageWidget = {
  id: string;
  /** A snake_case identifier the model chose. Shown as the frame's label. */
  title: string;
  /** The fragment exactly as generated. The shell wraps it; it is never edited. */
  code: string;
  /** 1–4 short strings the model wants shown while the visual comes up. */
  loadingMessages?: string[];
};

/**
 * The Content-Security-Policy every widget document carries.
 *
 * `default-src 'none'` is the whole enforcement: anything not named below is
 * refused. `img-src data:` is what makes a canvas or an inline SVG work without
 * opening remote images, which are both a privacy leak and a tracking pixel.
 *
 * `connect-src` has to list the same script hosts as `script-src`, because a
 * library that is itself allowed can still fetch its own chunks — that is how the
 * mermaid ES module on esm.sh resolves its imports.
 */
const CSP = [
  "default-src 'none'",
  "img-src data: blob:",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  `script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh`,
  "connect-src https://cdn.jsdelivr.net https://esm.sh",
].join("; ");

/**
 * The categorical palette, in the fixed order the guidebook specifies.
 *
 * Published as variables rather than left to the model because the ordering is the
 * point: a categorical scale is only readable if the same category is the same
 * colour in every chart of the conversation, and that only holds if the order is
 * fixed. A model choosing "a nice palette" per widget produces two charts where
 * the same series is blue in one and orange in the other.
 *
 * Chart.js cannot read CSS variables — a canvas has no cascade — so these are
 * offered as a documented escape hatch, but the model is told to hardcode the hex
 * for canvas and keep the variables for HTML.
 */
const PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
] as const;

/**
 * Theme values, light and dark, in the iframe's own vocabulary.
 *
 * The names are the guidebook's (`--text-primary`, `--surface-1`), mapped onto
 * Pawzz's tokens so a widget sits in the same palette as the app around it
 * instead of inventing a third light mode. Both blocks ship in every document and
 * one attribute decides which is live; that is what lets a theme change be a
 * message rather than a reload, so a running animation survives it.
 */
const THEME_CSS = `
  :root, [data-theme="light"] {
    color-scheme: light;
    --text-primary: var(--fg, #0b0b0b);
    --text-secondary: var(--fg-muted, #52514e);
    --surface-1: var(--surface, #fcfcfb);
    --border: var(--border-token, rgba(11, 11, 11, 0.1));
    --accent: var(--accent-token, #c9785b);
    --radius: 8px;
  }
  [data-theme="dark"] {
    color-scheme: dark;
    --text-primary: var(--fg, #f0efec);
    --text-secondary: var(--fg-muted, #c3c2b7);
    --surface-1: var(--surface, #1a1a19);
    --border: var(--border-token, rgba(255, 255, 255, 0.1));
    --accent: var(--accent-token, #d0896c);
    --radius: 8px;
  }
  ${PALETTE.map((hex, index) => `--palette-${index + 1}: ${hex};`).join("\n  ")}
`;

/**
 * Error reporting, installed in the <head> — before the widget's own markup.
 *
 * Position is the whole point. This used to live in the runtime script at the end
 * of the body, which meant it was registered *after* the fragment had already run:
 * a `THREE is not defined` thrown by the fragment, and the 404 on a library
 * script that never arrived, had both happened before there was a listener to
 * hear them. The frame was black and the app had nothing to say about it.
 *
 * A script that fails to load does not bubble its error, so the listener has to
 * be in the capture phase to see it — and that is the single most common failure
 * here, because a generated 3D scene reaching for a current three.js version asks
 * for a UMD build that no longer exists.
 */
const ERROR_JS = `
  window.__widgetError = function (message) {
    parent.postMessage(
      { type: "widgetError", text: String(message).slice(0, 240) },
      "*"
    );
  };
  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "SCRIPT" && target.src) {
      window.__widgetError("could not load " + target.src.replace(/^https:\\/\\//, ""));
      return;
    }
    window.__widgetError(event.message || "script error");
  }, true);
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    window.__widgetError(reason && reason.message ? reason.message : String(reason));
  });
`;

/**
 * The runtime the widget itself is handed.
 *
 * Three globals matter. `sendPrompt` is the escape hatch that turns a rendered
 * visual back into a conversation — without it a chart is a dead end, and the
 * only way forward is the user retyping what the widget could have said. The
 * height reporter is what lets the frame fit its content instead of scrolling
 * inside a fixed box. And `exportImage` is the only way the user can get the
 * visual out of the chat, which has to be done from in here: the parent cannot
 * reach into the frame at all, so the rasteriser cannot live out there.
 *
 * The theme is written into the document by `buildWidgetDocument` rather than
 * arrived at by this script matching the OS. The user may have Pawzz in dark
 * mode while their system is in light, and a widget that painted one frame of
 * white before correcting itself is a flash on every single widget.
 */
const RUNTIME_JS = `
  window.sendPrompt = function (text) {
    if (typeof text !== "string" || !text.trim()) return;
    parent.postMessage({ type: "sendPrompt", text: text }, "*");
  };
  function reportHeight() {
    var body = document.body;
    var height = Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      document.documentElement.scrollHeight
    );
    parent.postMessage({ type: "height", value: height }, "*");
  }
  new ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener("load", reportHeight);

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data) return;
    if (data.type === "theme") {
      document.documentElement.setAttribute("data-theme", data.dark ? "dark" : "light");
      reportHeight();
      return;
    }
    if (data.type === "exportImage") exportImage(data.requestId);
  });

  /**
   * Rasterises this document and hands the parent a PNG.
   *
   * Written here rather than pulled from a CDN, and the reason is specific
   * rather than ideological: html2canvas builds its layout by creating a hidden
   * iframe and reading that iframe's document. This document's origin is opaque,
   * and two opaque origins are cross-origin to each other, so that read throws
   * and the library rejects. It cannot be made to work without
   * "allow-same-origin", which is the one attribute this frame must never have.
   * The alternative — serialise the DOM into an SVG foreignObject and draw
   * that — was measured in this exact sandbox before being chosen: it produces a
   * real, untainted PNG where html2canvas refuses.
   *
   * Canvases are the one thing a clone does not carry: "cloneNode" copies the
   * element and none of its pixels, so a cloned Chart.js canvas is blank. Each
   * one is swapped for an image of its own bitmap before serialising, which is
   * what stops a chart from exporting as an empty rectangle.
   *
   * A WebGL scene is the remaining limit: its drawing buffer can be empty once
   * the frame has been presented, and that is the canvas's contents, not this
   * code's. The failure is reported rather than swallowed.
   */
  function exportImage(requestId) {
    var fail = function (reason) {
      parent.postMessage({ type: "exportResult", requestId: requestId, error: reason }, "*");
    };
    try {
      var surface =
        getComputedStyle(document.documentElement).getPropertyValue("--surface-1").trim() || "#ffffff";
      var width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      var height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

      // The clone lands in a data URL, which has no access to this document's
      // stylesheets, so they are read out and carried across with it.
      var css = "";
      for (var s = 0; s < document.styleSheets.length; s++) {
        try {
          var rules = document.styleSheets[s].cssRules;
          for (var r = 0; r < rules.length; r++) css += rules[r].cssText + "\\n";
        } catch (e) { /* a sheet that cannot be read is a sheet that cannot be inlined */ }
      }

      var holder = document.createElement("div");
      var style = document.createElement("style");
      style.textContent = css;
      holder.appendChild(style);

      var live = document.body.querySelectorAll("canvas");
      var clone = document.body.cloneNode(true);
      var copies = clone.querySelectorAll("canvas");
      for (var c = 0; c < copies.length; c++) {
        try {
          var shot = document.createElement("img");
          shot.setAttribute("src", live[c].toDataURL("image/png"));
          shot.setAttribute("width", live[c].clientWidth);
          shot.setAttribute("height", live[c].clientHeight);
          if (live[c].getAttribute("style")) shot.setAttribute("style", live[c].getAttribute("style"));
          copies[c].parentNode.replaceChild(shot, copies[c]);
        } catch (e) { /* a tainted canvas stays an empty one */ }
      }
      holder.appendChild(clone);

      var xml = new XMLSerializer().serializeToString(holder);
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
        '<foreignObject x="0" y="0" width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml">' + xml + "</div>" +
        "</foreignObject></svg>";

      var image = new Image();
      image.onload = function () {
        try {
          var scale = Math.min(2, window.devicePixelRatio || 1);
          var canvas = document.createElement("canvas");
          canvas.width = width * scale;
          canvas.height = height * scale;
          var ctx = canvas.getContext("2d");
          // The frame is transparent, so an export needs a surface of its own or
          // the PNG is a dark chart on nothing at all.
          ctx.fillStyle = surface;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(image, 0, 0, width, height);
          parent.postMessage(
            { type: "exportResult", requestId: requestId, dataUrl: canvas.toDataURL("image/png") },
            "*"
          );
        } catch (e) {
          fail("Could not encode the image.");
        }
      };
      image.onerror = function () { fail("Could not rasterise this widget."); };
      image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    } catch (e) {
      fail(e && e.message ? e.message : "Could not export this widget.");
    }
  }

`;

/**
 * Reduces a host token to something safe to interpolate into the document.
 *
 * The values are the app's own, read off `document.documentElement` and never
 * from the model, so this is not about the model being hostile — it is about the
 * document being assembled by string concatenation, where a token containing
 * `</style>` would end the block early and a `;}` would inject rules.
 *
 * Stripping rather than escaping is the honest choice here: these are colours
 * and a `</style>` is not a colour, so a token that has been tampered with is
 * better dropped than repaired.
 */
function sanitiseToken(value: string): string {
  return value.replace(/[<>{};]/g, "").trim();
}

/**
 * Reads the app's live tokens so a widget can use them.
 *
 * Read from the host rather than duplicated as literals: a widget that hardcodes
 * a colour is right until the theme changes, and then it is wrong in a way nobody
 * notices until a user complains. Only the tokens a widget can plausibly need are
 * collected, and an unreadable one is simply absent — the iframe's own defaults
 * in `THEME_CSS` then apply.
 */
export function readHostTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const style = window.getComputedStyle(document.documentElement);
  const wanted: Record<string, string> = {
    "--fg": "--foreground",
    "--fg-muted": "--muted-foreground",
    "--surface": "--surface",
    "--border-token": "--border",
    "--accent-token": "--accent",
  };

  const tokens: Record<string, string> = {};
  for (const [alias, name] of Object.entries(wanted)) {
    const value = style.getPropertyValue(name).trim();
    if (value) tokens[alias] = value;
  }
  return tokens;
}

/**
 * Wraps a model fragment in the document that runs it.
 *
 * The fragment is inserted verbatim. It is model output inside an opaque-origin
 * frame, so rewriting it would be security theatre dressed as helpfulness — the
 * one thing that must not be lost is a `</script>` inside a string, which is why
 * the fragment lands in the body and the runtime lives in a separate script the
 * fragment cannot close.
 */
export function buildWidgetDocument(fragment: string, isDark: boolean): string {
  const tokens = readHostTokens();
  const inline = Object.entries(tokens)
    .map(([name, value]) => `${name}:${sanitiseToken(value)}`)
    .join(";");

  return `<!DOCTYPE html>
<html data-theme="${isDark ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<script>
${ERROR_JS}
</script>
<style>
  :root { ${inline} }
${THEME_CSS}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  /* Transparent on the root, which is the one that was wrong.

     The body alone was transparent and it was not enough: the html element still
     paints the canvas background, and a canvas background is opaque white. A
     widget in a dark reply therefore arrived as a white rectangle with a dark
     card floating in it, which is the exact thing a dashboard must not look like.
     Clearing both means the app's own surface shows through and the widget is
     simply part of the reply. */
  html, body {
    background: transparent;
  }
  body {
    color: var(--text-primary);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.5;
  }
  /* No card, no panel, no wrapper of any kind. The frame around a widget is
     transparent and the app's background shows through, so a widget is part of
     the reply rather than an object embedded in it. A widget that genuinely
     needs a filled tile of its own — a stat row, a plot area — should paint it
     with var(--surface-1), which follows the theme, and leave the page around it
     alone. */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
</head>
<body>
${fragment}
<script>
${RUNTIME_JS}
</script>
</body>
</html>`;
}

/** Caps a rendered widget's height so one runaway document cannot lock the page. */
export const WIDGET_MAX_HEIGHT = 900;

/**
 * The floor for that cap, and the reason the two are separate numbers.
 *
 * A widget that reports nothing at all has not necessarily failed — a document
 * that is genuinely empty, or one whose scripts have not run, reports zero. A
 * frame of zero height is invisible and unclickable, which reads as a bug in the
 * app rather than as a widget that produced nothing, so there is a floor.
 */
export const WIDGET_MIN_HEIGHT = 40;
