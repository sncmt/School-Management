import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getSchoolSite } from "@/lib/site";
import { getSiteFromHost } from "@/lib/tenant";
import {
  fallbackLocale,
  isLocale,
  LOCALE_COOKIE,
  localeFromSchoolLanguage,
  siteDefaultLocale,
  type Locale,
} from "./config";

/*
 * The language of each request, without any locale in the URL:
 *   1. the visitor's own choice on this site (switcher cookie)
 *   2. a school's site: the school's language
 *   3. the site's default
 */
const resolveLocale = async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const site = getSiteFromHost((await headers()).get("host"));
  if (site.type !== "SCHOOL") return siteDefaultLocale[site.type];

  const school = await getSchoolSite(site.subdomain).catch(() => null);
  return school ? localeFromSchoolLanguage(school.language) : fallbackLocale;
};

export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Dhaka",
  };
});
