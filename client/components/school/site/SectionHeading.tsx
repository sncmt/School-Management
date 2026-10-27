/** A homepage section's title, centred: a small label between gold dashes above it, a line under it. */
export function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      {eyebrow && (
        <p className="mb-3 inline-flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-school-sidebar uppercase dark:text-sidebar-primary">
          <span aria-hidden className="h-px w-8 bg-sidebar-primary" />
          {eyebrow}
          <span aria-hidden className="h-px w-8 bg-sidebar-primary" />
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground sm:text-lg">{subtitle}</p>}
    </div>
  );
}
