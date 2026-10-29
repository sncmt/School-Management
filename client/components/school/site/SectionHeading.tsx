import { cn } from "@/lib/utils";

/**
 * A homepage section's title: a small label between gold dashes above it, a line under it.
 * Centred, or on the left (beside a picture).
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const left = align === "left";
  return (
    <div className={cn("mb-10 max-w-2xl sm:mb-12", left ? "text-left" : "mx-auto text-center")}>
      {eyebrow && (
        <p className="mb-3 inline-flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-school-sidebar uppercase dark:text-sidebar-primary">
          <span aria-hidden className="h-px w-8 bg-sidebar-primary" />
          {eyebrow}
          {!left && <span aria-hidden className="h-px w-8 bg-sidebar-primary" />}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground sm:text-lg">{subtitle}</p>}
    </div>
  );
}
