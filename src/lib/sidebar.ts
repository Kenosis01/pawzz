import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

const WIDTH_KEY = "pawzz.sidebar.width";
const COLLAPSED_KEY = "pawzz.sidebar.collapsed";

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 260;

function readWidth(): number {
  if (typeof localStorage === "undefined") return SIDEBAR_DEFAULT;
  const stored = Number(localStorage.getItem(WIDTH_KEY));
  return stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX ? stored : SIDEBAR_DEFAULT;
}

function readCollapsed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(COLLAPSED_KEY) === "true";
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked storage. The sidebar still works, it just will not remember.
  }
}

/**
 * Sidebar width and open/closed state, persisted across launches. Owned by
 * AppShell so the collapse control and the reopen control never disagree.
 *
 * The handle sits on the sidebar's right edge, which is the window's left edge,
 * so pointer x is the sidebar width directly.
 *
 * State starts at the defaults and is filled in from storage by an effect. The
 * desktop build read storage in a `useState` initialiser, which works when the
 * whole app is client-rendered and throws during a server render. Starting from
 * fixed values also keeps the first client render identical to the server's —
 * the width is an inline style, so a mismatch here is a visible jump.
 */
export function useSidebar() {
  const [width, setWidthState] = useState(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    setWidthState(readWidth());
    setCollapsed(readCollapsed());
  }, []);

  useEffect(() => {
    document.body.toggleAttribute("data-resizing", resizing);
  }, [resizing]);

  const setWidth = useCallback((next: number) => {
    const clamped = Math.min(Math.max(Math.round(next), SIDEBAR_MIN), SIDEBAR_MAX);
    setWidthState(clamped);
    write(WIDTH_KEY, String(clamped));
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((open) => {
      write(COLLAPSED_KEY, String(!open));
      return !open;
    });
  }, []);

  const startResize = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  }, []);

  const resize = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      setWidth(event.clientX);
    },
    [setWidth],
  );

  const endResize = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizing(false);
  }, []);

  return { width, collapsed, resizing, toggle, startResize, resize, endResize };
}
