import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/sncmt-logo.png";
import { MarketingNav } from "./MarketingNav";
import { StickyHeader } from "./StickyHeader";

// the homepage's width: 1240px of content with a 24px gutter (16px on a phone)
export const HP_PAGE = "mx-auto w-full max-w-[1288px] px-4 sm:px-6";

/** The marketing site's bar: the logo and SNCMT, the sections, the language, "Log in" and "Get started". */
export async function MarketingHeader() {
  const t = await getTranslations("marketing");

  return (
    <StickyHeader>
      <div className={`${HP_PAGE} flex h-[60px] items-center gap-3 sm:h-[68px] sm:gap-7`}>
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-3 rounded-md text-[22px] leading-none font-extrabold tracking-[-0.02em] text-hp-deep sm:text-2xl focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:outline-none"
        >
          {/* the mark at its own shape (281 x 256), as tall as the name beside it reads well */}
          <Image src={logo} alt="" width={53} height={48} priority className="h-11 w-auto shrink-0 sm:h-12" />
          {/* a little lower than centred: the mark carries its weight in the book at its foot */}
          <span className="translate-y-[3px]">{t("brand")}</span>
        </Link>
        <MarketingNav />
      </div>
    </StickyHeader>
  );
}
