import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { MarketingNav } from "./MarketingNav";

/** The marketing site's bar: dark glass over the hero, staying at the top. */
export async function MarketingHeader() {
  const t = await getTranslations("common");

  return (
    <header className="dark sticky top-0 z-40 border-b border-white/10 bg-mk-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={t("appName")}>
          <BrandMark name={t("appName")} />
        </Link>
        <MarketingNav />
      </div>
    </header>
  );
}
