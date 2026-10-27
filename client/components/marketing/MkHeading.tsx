import { cn } from "@/lib/utils";

/** A marketing section's heading: a numbered eyebrow, the title and a line under it. */
export function MkHeading({
  index,
  eyebrow,
  title,
  subtitle,
  dark,
  className,
}: {
  index: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto mb-12 max-w-2xl text-center sm:mb-16", className)}>
      <p className={cn("inline-flex items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase", dark ? "text-mk-amber" : "text-mk-violet")}>
        <span className="font-mono tabular-nums opacity-70">{index}</span>
        <span aria-hidden className={cn("h-px w-8", dark ? "bg-mk-amber/50" : "bg-mk-violet/40")} />
        {eyebrow}
      </p>
      <h2 className={cn("mt-4 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-[2.75rem]", dark ? "text-white" : "text-foreground")}>
        {title}
      </h2>
      {subtitle && <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", dark ? "text-white/65" : "text-muted-foreground")}>{subtitle}</p>}
    </div>
  );
}
