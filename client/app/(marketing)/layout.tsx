import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

// Public marketing site. Schools log in on their own subdomain and the
// platform admin on admin.<domain>, so there are no login links here.
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold">
            {t("appName")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("appName")}
        </div>
      </footer>
    </div>
  );
}
