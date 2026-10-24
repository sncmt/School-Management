"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { topBarIconButton } from "./topBar";

/** Light / dark. Both icons are drawn and CSS shows the right one, so the first paint matches. */
export function ThemeToggle() {
  const t = useTranslations("shell");
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className={cn(topBarIconButton, "rounded-full [&_svg]:size-4")}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={t(dark ? "lightMode" : "darkMode")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </button>
  );
}
