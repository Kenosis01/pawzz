"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  MoreIcon,
} from "../icons/Icons";
import {
  WIDGET_MAX_HEIGHT,
  WIDGET_MIN_HEIGHT,
  buildWidgetDocument,
} from "../../lib/widget";
import type { MessageWidget } from "../../state/conversation";
import styles from "./Widget.module.css";

/** Height shown until the widget has measured itself. */
const PLACEHOLDER_HEIGHT = 120;

/** How long each of the model's loading messages is shown, in ms. */
const LOADING_ROTATION_MS = 2600;

/** The longest follow-up a widget is allowed to inject into the conversation. */
const MAX_PROMPT = 2000;

/** Turns a widget's title into something safe to name a downloaded file. */
function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "widget";
}

/** Writes a blob to disk under `name`, without leaving the page. */
function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  // Appended, clicked, removed. A detached anchor is not reliably treated as a
  // download in Chromium — the click fires and nothing is saved — and this is the
  // one place in the app that writes a file, so it is worth the two extra lines.
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on a delay rather than immediately: Safari cancels an in-flight
  // download whose object URL disappears in the same tick.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * The placeholder shown while the model is still writing a widget.
 *
 * Deliberately not a card: no border, no surface, no header, no "Drawing…"
 * label. It is four shimmering lines on the same background as the rest of the
 * transcript, because that is what is happening — a reply is being written — and
 * a framed box around it says "a separate object is loading here", which pulls
 * attention away from the prose the user is actually reading. Framing it also
 * meant guessing at the size of the thing arriving, and the guess was wrong
 * every time the model wrote anything other than a chart.
 */
function WidgetSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-busy="true">
      <span className={styles.srOnly}>Drawing</span>
      <div className={styles.skeletonLine} style={{ width: "88%" }} />
      <div className={styles.skeletonLine} style={{ width: "72%" }} />
      <div className={styles.skeletonLine} style={{ width: "80%" }} />
      <div className={styles.skeletonLine} />
    </div>
  );
}

/**
 * A visual the model drew, running in a sandboxed frame.
 *
 * The frame is the security boundary, so the shape of this component is mostly a
 * consequence of that: `sandbox="allow-scripts"` with no `allow-same-origin`, and
 * every inbound message checked against `contentWindow` before it is believed. A
 * frame without a same origin has no access to this app at all, so nothing it
 * says about height or about wanting to send a message is privileged — it can
 * only ask.
 *
 * That same isolation shapes "Copy as image". The parent cannot read a pixel of
 * the frame's DOM, so the rasteriser runs inside it and posts a data URL back —
 * and it is hand-written rather than a library, because every library that does
 * this builds its layout in a hidden iframe, which an opaque origin cannot read.
 * The reasoning is in `lib/widget.ts` next to the code.
 */
export function Widget({
  widget,
  pending,
  isDark,
  onSendPrompt,
}: {
  widget: MessageWidget;
  /** The model is still writing this call's arguments. */
  pending?: boolean;
  /** The app's resolved theme. Written into the document, not sent to it. */
  isDark: boolean;
  /** Invoked when the widget calls `sendPrompt`. */
  onSendPrompt?: (text: string) => void;
}) {
  if (pending) return <WidgetSkeleton />;
  return (
    <LoadedWidget
      widget={widget}
      isDark={isDark}
      onSendPrompt={onSendPrompt}
    />
  );
}

function LoadedWidget({
  widget,
  isDark,
  onSendPrompt,
}: {
  widget: MessageWidget;
  isDark: boolean;
  onSendPrompt?: (text: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(PLACEHOLDER_HEIGHT);
  const [ready, setReady] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<null | "image" | "html">(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingExport = useRef<string | null>(null);

  // Rebuilt only when the code changes. The host tokens and the theme are read
  // inside, so this is deliberately not memoised on `isDark`: a theme change must
  // not reload the frame, or a running 3D scene would restart every time the user
  // changed appearance.
  const source = useMemo(
    () => buildWidgetDocument(widget.code, isDark),
    [widget.code, isDark],
  );

  const loading = widget.loadingMessages ?? [];
  const loadingText = loading.length
    ? loading[loadingIndex % loading.length]
    : "Rendering…";

  useEffect(() => {
    if (!loading.length || ready) return;
    const timer = window.setInterval(
      () => setLoadingIndex((index) => index + 1),
      LOADING_ROTATION_MS,
    );
    return () => window.clearInterval(timer);
  }, [loading.length, ready]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    // Capture, so the menu closes even if something inside it stops propagation.
    // The containment test is not an optimisation, it is the whole thing: without
    // it this fires on the pointerdown *of the button being pressed*, React
    // unmounts the list, and the click that follows lands on nothing. The menu
    // then opened and did nothing, which looks like a broken download rather than
    // like a race.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const exportImage = useCallback(
    (requestId: string) => {
      setBusy("image");
      setError(null);
      // The request id is a nonce, not a sequence: only one export can be in
      // flight, so matching on identity is enough to tell this reply from an
      // unrelated message on the window.
      pendingExport.current = requestId;
      frame.current?.contentWindow?.postMessage(
        { type: "exportImage", requestId },
        "*",
      );
    },
    [],
  );

  const onMessage = useCallback(
    (event: MessageEvent) => {
      const win = frame.current?.contentWindow;
      // Identity, not origin. A sandboxed frame has an opaque origin, so
      // `event.origin` is the string "null" for every widget and checking it
      // would prove nothing. The window reference is the real check: it is this
      // frame's own window and nothing else can be.
      if (!win || event.source !== win) return;

      const data: unknown = event.data;
      if (typeof data !== "object" || data === null) return;
      const message = data as {
        type?: unknown;
        value?: unknown;
        text?: unknown;
        requestId?: unknown;
        dataUrl?: unknown;
        error?: unknown;
      };

      if (message.type === "height" && typeof message.value === "number") {
        // A widget that reports a height larger than the box, or a nonsensical
        // one, is clamped rather than trusted. A generated document should not be
        // able to size its own frame past the cap.
        const next = Math.min(
          WIDGET_MAX_HEIGHT,
          Math.max(WIDGET_MIN_HEIGHT, Math.round(message.value)),
        );
        setHeight(next);
        setReady(true);
        return;
      }

      if (message.type === "sendPrompt" && typeof message.text === "string") {
        const text = message.text.trim().slice(0, MAX_PROMPT);
        if (text) onSendPrompt?.(text);
        return;
      }

      if (message.type === "widgetError" && typeof message.text === "string") {
        // Hoisted because narrowing a property access does not survive into a
        // callback, and it loses its type on the way.
        const reason: string = message.text;
        // A broken widget reports nothing on its own — a 3D scene whose library
        // failed to load is a black rectangle, which is indistinguishable from one
        // that is still loading. Showing the reason is the difference between a
        // bug report and a shrug.
        //
        // First one wins. A missing library throws twice: once when the script
        // fails to arrive, and again as `THREE is not defined` when the code that
        // wanted it runs. The first is the cause and the second is a consequence,
        // and "could not load unpkg.com/three@0.170.0/…" is the one that says
        // what to change.
        setError((current) => current ?? reason);
        // Stop claiming to be loading. Nothing more is coming, and a status line
        // that says "Rendering…" forever is worse than one that admits the frame
        // is broken.
        setReady(true);
        return;
      }

      if (message.type === "exportResult") {
        if (message.requestId !== pendingExport.current) return;
        pendingExport.current = null;
        setBusy(null);
        if (typeof message.dataUrl === "string" && message.dataUrl) {
          saveBlob(dataUrlToBlob(message.dataUrl), `${fileName(widget.title)}.png`);
          return;
        }
        setError(
          typeof message.error === "string"
            ? message.error
            : "Could not render this widget to an image.",
        );
      }
    },
    [onSendPrompt, widget.title],
  );

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  return (
    <figure className={styles.frame} data-ready={ready ? "true" : undefined}>
      <figcaption className={styles.header}>
        <span className={styles.label}>{widget.title}</span>
        <span className={styles.spacer} />
        <div
          className={styles.menu}
          ref={menuRef}
          data-open={menuOpen ? "true" : undefined}
        >
          <button
            type="button"
            className={styles.action}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Options for ${widget.title}`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreIcon size={14} />
          </button>

          {menuOpen ? (
            <ul className={styles.menuList} role="menu">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  disabled={busy !== null}
                  onClick={() => exportImage(widget.id || "export")}
                >
                  <ImageIcon size={14} />
                  {busy === "image" ? "Copying…" : "Copy as image"}
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  disabled={busy !== null}
                  onClick={() => {
                    setBusy("html");
                    setError(null);
                    // The document is already self-contained: the shell carries the
                    // CSP, the palette and the theme, so what is written to disk
                    // opens correctly on its own rather than needing this app.
                    saveBlob(
                      new Blob([source], { type: "text/html" }),
                      `${fileName(widget.title)}.html`,
                    );
                    setBusy(null);
                    setMenuOpen(false);
                  }}
                >
                  <DownloadIcon size={14} />
                  Download as HTML
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  disabled={busy !== null}
                  onClick={() => {
                    void navigator.clipboard?.writeText(widget.code).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1400);
                    });
                    setMenuOpen(false);
                  }}
                >
                  {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  {copied ? "Copied" : "Copy code"}
                </button>
              </li>
              {error ? (
                <li role="none" className={styles.menuError}>
                  {error}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </figcaption>

      {error ? (
        <p className={styles.failure} role="alert">
          This visual could not be drawn — {error}
        </p>
      ) : null}

      {ready ? null : (
        <p className={styles.loading} role="status">
          {loadingText}
        </p>
      )}

      <iframe
        ref={frame}
        className={styles.inner}
        title={widget.title}
        srcDoc={source}
        // No `allow-same-origin`: without it the frame's document is on an opaque
        // origin and cannot touch this page's storage, cookies or DOM. No
        // `allow-forms` or `allow-popups` either, so the only capability granted
        // is running the script the model wrote.
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        style={{ height: `${height}px` }}
      />
    </figure>
  );
}

/** A data URL, as a Blob. `fetch` on a data URL is the only route to the bytes. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head ?? "")?.[1] ?? "image/png";
  const binary = head?.includes("base64") ?? false;
  if (!body) return new Blob([], { type: mime });

  if (binary) {
    const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(body)], { type: mime });
}
