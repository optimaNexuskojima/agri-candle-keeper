import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

const KEY = "agri-candle-theme";

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("light", mode === "light");
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/** Presentation-only theme preference (dark default), persisted on device. */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    let stored: ThemeMode = "dark";
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "light" || raw === "dark") stored = raw;
    } catch {
      stored = "dark";
    }
    setMode(stored);
    apply(stored);
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      apply(next);
      return next;
    });
  }, []);

  return { mode, toggle };
}
