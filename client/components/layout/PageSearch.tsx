"use client";

import { CornerDownLeft, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SearchablePage = { href: string; label: string; group: string | null; icon: LucideIcon };

/** The search box in the top bar: opens the page finder (also Ctrl+K / ⌘K). */
export function PageSearch({ pages }: { pages: SearchablePage[] }) {
  const t = useTranslations("shell");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center gap-2 rounded-full bg-muted px-4 text-sm text-muted-foreground ring-1 ring-transparent transition-colors hover:ring-border"
      >
        <span className="flex-1 text-left">{t("search")}</span>
        <kbd className="hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
        <Search className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">{t("search")}</DialogTitle>
          {open && <Finder pages={pages} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Finder({ pages, onDone }: { pages: SearchablePage[]; onDone: () => void }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const q = query.trim().toLowerCase();
  const found = q ? pages.filter((p) => p.label.toLowerCase().includes(q) || p.group?.toLowerCase().includes(q)) : pages;
  const active = Math.min(index, Math.max(found.length - 1, 0));

  const go = (page: SearchablePage | undefined) => {
    if (!page) return;
    onDone();
    router.push(page.href);
  };

  // keep the highlighted page in view while moving with the arrow keys
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div>
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, found.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(found[active]);
            }
          }}
          placeholder={t("searchPlaceholder")}
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label={t("search")}
        />
        <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">Esc</kbd>
      </div>
      {found.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noPages")}</p>
      ) : (
        <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5" role="listbox">
          {found.map((p, i) => (
            <li key={p.href} role="option" aria-selected={i === active} data-index={i}>
              <button
                type="button"
                onMouseMove={() => setIndex(i)}
                onClick={() => go(p)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                  i === active ? "bg-brand-soft text-foreground" : "text-muted-foreground",
                )}
              >
                <p.icon className={cn("size-4", i === active && "text-brand")} />
                <span className="flex-1 font-medium">{p.label}</span>
                {p.group && <span className="text-xs text-muted-foreground">{p.group}</span>}
                {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
