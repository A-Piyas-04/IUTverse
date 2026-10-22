"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = { theme: Theme; setTheme(theme: Theme): void; toggleTheme(): void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
export const THEME_STORAGE_KEY = "iutverse-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f2f6ef" : "#000000");
}

const currentTheme = (): Theme => document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The first render must match the server's (light). The inline script in the
  // document head has already put the saved theme on <html>, so pick it up
  // right after mount instead of reading the DOM during render.
  const [theme, setThemeState] = useState<Theme>("light");
  const setTheme = (next: Theme) => { setThemeState(next); applyTheme(next); try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Theme still applies for this tab. */ } };

  useEffect(() => { setThemeState(currentTheme()); }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) { setThemeState(event.newValue); applyTheme(event.newValue); } };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme: () => setTheme(theme === "light" ? "dark" : "light") }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
