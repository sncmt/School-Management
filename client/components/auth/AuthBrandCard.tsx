import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

/*
 * The login pages: one card in the middle of a lightly dotted page, with the school's logo (or
 * an icon on its colour) and name on top, the form, and a link under a line. The colour is the
 * school's own accent (Settings > Appearance): it sets --primary for the whole site.
 */
export function AuthBrandCard({
  logo,
  icon,
  title,
  subtitle,
  children,
  footer,
  back,
}: {
  // the school's logo (a signed link); without one, the icon on the accent colour
  logo?: string | null;
  icon: ReactNode;
  title: string;
  // the name in the other language, or what the page is for
  subtitle?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-muted/50 [background-image:radial-gradient(rgb(0_0_0/0.09)_1px,transparent_1px)] [background-size:22px_22px] dark:[background-image:radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)]">
      <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
        <div>{back}</div>
        <LanguageSwitcher variant="accent" className="bg-background shadow-sm" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[25rem] rounded-xl border bg-card px-6 py-8 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-12px_rgb(0_0_0/0.14)] sm:px-8">
          <div className="flex flex-col items-center text-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- school logos are signed links to private storage
              <img src={logo} alt="" className="size-16 rounded-lg object-contain" />
            ) : (
              <div className="flex size-[3.75rem] items-center justify-center rounded-lg bg-primary text-primary-foreground [&_svg]:size-7">{icon}</div>
            )}
            <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="my-6 border-t" />
          {children}

          {footer && (
            <>
              <div className="mt-6 mb-5 border-t" />
              <div className="text-center text-sm">{footer}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
