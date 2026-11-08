import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { MarketingNav } from "./MarketingNav";

/** The marketing site's bar: white, a hairline under it, staying at the top over the navy hero. */
export async function MarketingHeader() {
  const t = await getTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-[0_1px_12px_rgb(15_23_42/0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={t("appName")} className="min-w-0">
          <BrandMark name={t("appName")} onWhite />
        </Link>
        <MarketingNav />
      </div>
    </header>
  );
}
