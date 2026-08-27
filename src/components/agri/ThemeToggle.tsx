import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/agri/theme";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="border-border bg-elevated text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-full border"
    >
      {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
