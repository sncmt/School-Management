import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/** The platform's mark: a cap on a blue-to-gold tile, and the name beside it (navy on white, white on navy). */
export function BrandMark({ name, onWhite, className }: { name: string; onWhite?: boolean; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--mk-blue),var(--mk-gold))] text-white shadow-lg shadow-mk-blue/30">
        <GraduationCap className="size-5" strokeWidth={2.25} />
      </span>
      <span className={cn("truncate text-[17px] leading-none font-bold tracking-tight", onWhite ? "text-mk-ink" : "text-white")}>{name}</span>
    </span>
  );
}
