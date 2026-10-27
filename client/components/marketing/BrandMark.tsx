import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/** The platform's mark: a cap on a violet-to-amber tile, and the name beside it. */
export function BrandMark({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--mk-violet),var(--mk-amber))] text-white shadow-lg shadow-mk-violet/30">
        <GraduationCap className="size-5" strokeWidth={2.25} />
      </span>
      <span className="text-[17px] leading-none font-bold tracking-tight text-white">{name}</span>
    </span>
  );
}
