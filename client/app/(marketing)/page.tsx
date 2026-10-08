import { getTranslations } from "next-intl/server";

// Placeholder homepage; the real marketing design comes later.
export default async function HomePage() {
  const t = await getTranslations("marketing");

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
    </section>
  );
}
