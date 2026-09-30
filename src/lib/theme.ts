import { useCallback, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "pawzz.theme";

function read(): Theme {
  // The desktop build read localStorage straight from a useState initialiser.
  // That throws during a server render, so the value is resolved in an effect
  // instead — see the note on the state below.
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function prefersDark(): boolean {
  if (typeof matchMedia === "undefined") return false;
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

function paint(theme: Theme): boolean {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

/**
 * Theme preference. `system` follows the OS and keeps following it live, so the
 * user never has to reopen Pawzz after switching appearance at sunset.
 *
 * The inline script in the root layout applies the same resolution before first
 * paint, so the window never flashes the wrong surface. That is also why state
 * starts at fixed values rather than reading storage during render: the server
 * has no storage, and a first render that disagreed with the client's would be
 * a hydration mismatch on every page that shows a theme control.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const initial = read();
    setThemeState(initial);
    setIsDark(paint(initial));
  }, []);

  useEffect(() => {
    setIsDark(paint(theme));
    if (theme !== "system") {
      localStorage.setItem(STORAGE_KEY, theme);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);

    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setIsDark(paint("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggle = useCallback(
    () =>
      setThemeState((current) => {
        const resolved =
          current === "system" ? (prefersDark() ? "dark" : "light") : current;
        return resolved === "dark" ? "light" : "dark";
      }),
    [],
  );

  return { theme, isDark, setTheme, toggle };
}
