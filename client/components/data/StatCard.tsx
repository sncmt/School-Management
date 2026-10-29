"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  // a short line under the number
  sub?: ReactNode;
  // alert: the number in red (something needs attention); warn: in amber
  tone?: "default" | "alert" | "warn";
  // a small coloured dot after the number (e.g. a status's colour)
  dot?: string;
  // the number is still on its way
  loading?: boolean;
  // a link, a button (selected = the filter it stands for is on), or neither
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
};

/**
 * A headline number, the same on every page: a quiet icon box, then what it is (small capitals),
 * the number, and a short line under it.
 */
export function StatCard({ icon: Icon, label, value, sub, tone = "default", dot, loading, href, onClick, selected, className }: Props) {
  const interactive = !!href || !!onClick;
  const box = cn(
    "group flex w-full items-center gap-4 rounded-xl border bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
    interactive && "transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-md",
    selected && "border-navy/35 ring-1 ring-navy/25",
    className,
  );
  const body = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-foreground/70 transition-colors",
          interactive && "group-hover:text-foreground",
          selected && "border-navy/25 bg-navy-soft text-navy",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
        <span className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="my-1 h-6 w-14" />
          ) : (
            <span
              className={cn(
                "truncate text-2xl leading-tight font-semibold tracking-tight tabular-nums",
                tone === "alert" && "text-red-600 dark:text-red-400",
                tone === "warn" && "text-amber-600 dark:text-amber-400",
              )}
            >
              {value}
            </span>
          )}
          {dot && <span className={cn("size-2 shrink-0 rounded-full", dot)} />}
        </span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={box}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={box}>
        {body}
      </button>
    );
  }
  return <div className={box}>{body}</div>;
}
