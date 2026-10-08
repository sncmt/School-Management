import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { FullPageState } from "@/components/auth/FullPageState";
import { getSchoolSite } from "@/lib/site";
import { getSiteFromHost } from "@/lib/tenant";

// On a school's subdomain with no active school behind it, say that instead
// of a plain "page not found".
export default async function NotFound() {
  const t = await getTranslations("errors");
  const site = getSiteFromHost((await headers()).get("host"));
  const missingSchool =
    site.type === "SCHOOL" && !(await getSchoolSite(site.subdomain).catch(() => null));

  return missingSchool ? (
    <FullPageState title={t("schoolNotFoundTitle")} message={t("schoolNotFoundMessage")} />
  ) : (
    <FullPageState title={t("pageNotFoundTitle")} message={t("pageNotFoundMessage")} />
  );
}
