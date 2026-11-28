"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The homepage's bar: frosted white at the top of the window, a hairline under it once the page has scrolled. */
export function StickyHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "hp-sans sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md backdrop-saturate-150 transition-colors",
        scrolled ? "border-hp-hair" : "border-transparent",
      )}
    >
      {children}
    </header>
  );
}
