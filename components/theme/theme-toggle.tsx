"use client";

import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const COOKIE_NAME = "theme";

function readStoredTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  if (match) return decodeURIComponent(match[1]) as Theme;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    // Reads a cookie/system preference that only exists in the browser, and
    // re-applies the attribute after React Strict Mode's dev-only remount
    // clears it — matches Next.js's documented theme-flash-prevention
    // pattern, can't be computed at render time (server has no cookie/matchMedia).
    const current = readStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
    document.documentElement.setAttribute("data-theme", current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
