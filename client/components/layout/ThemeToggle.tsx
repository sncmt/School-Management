"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** Light / dark. Both icons are drawn and CSS shows the right one, so the first paint matches. */
export function ThemeToggle() {
  const t = useTranslations("shell");
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={t(dark ? "lightMode" : "darkMode")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
