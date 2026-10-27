import { ArrowRight, MapPin, Megaphone, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPublicNotices } from "@/lib/publicNotices";
import { hasAdmission, type SchoolSite } from "@/lib/site";
import { HeroSlider } from "./HeroSlider";
import { OpenNoticeButton } from "./NoticeBoard";

// "+8801712345678" -> "01712345678", how people here write it
const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");

/*
 * The top of the homepage, in two parts: on the left the school's name, a line about it, the
 * way to admission (or the notices) and its phone and address; on the right the picture frame,
 * set on a tilted block of the school's colour, with the newest notice floating at its corner.
 * One column on a phone, the words first.
 */
export async function HeroSection({ school, name, otherName }: { school: SchoolSite; name: string; otherName: string | null }) {
  // the notices section loads the same page; Next keeps one copy of the request
  const [t, notices] = await Promise.all([getTranslations("schoolHome.hero"), getPublicNotices(school.subdomain)]);
  const latest = notices?.items[0];
  const primary = hasAdmission(school.admission)
    ? { href: "#admission", label: t("admission") }
    : { href: "#notices", label: t("notices") };
  const firstAddressLine = school.address?.split("\n")[0];

  return (
    <section className="relative isolate overflow-hidden">
      {/* backdrop: a faint grid, and soft light in the school's colour and the gold */}
      <div aria-hidden className="site-hero-grid absolute inset-0 -z-10" />
      <div aria-hidden className="absolute -top-32 -left-32 -z-10 size-[28rem] rounded-full bg-school-sidebar/10 blur-3xl" />
      <div aria-hidden className="absolute top-1/3 -right-24 -z-10 size-[24rem] rounded-full bg-sidebar-primary/15 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-school-sidebar uppercase shadow-sm backdrop-blur dark:text-foreground">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-sidebar-primary/70 motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-sidebar-primary" />
            </span>
            {t("eyebrow")}
          </span>

          <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl xl:text-[3.5rem]">{name}</h1>
          {/* a hand-drawn gold stroke under the name */}
          <svg aria-hidden viewBox="0 0 220 14" className="mt-3 h-3.5 w-44 text-sidebar-primary" fill="none">
            <path d="M2 10C40 3 90 2 130 5s60 4 88-2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          {otherName && otherName !== name && <p className="mt-3 text-lg font-medium text-muted-foreground">{otherName}</p>}

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{t("tagline")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={primary.href}
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-school-sidebar px-6 font-semibold text-white shadow-lg shadow-school-sidebar/25 transition-transform hover:-translate-y-0.5"
            >
              {primary.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#contact"
              className="inline-flex h-12 items-center gap-2 rounded-lg border bg-card px-6 font-semibold shadow-sm transition-colors hover:bg-muted"
            >
              {t("contact")}
            </a>
          </div>

          {(school.phone || firstAddressLine) && (
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t pt-6">
              {school.phone && (
                <Fact icon={<Phone className="size-4" />} label={t("phone")}>
                  <a href={`tel:${school.phone}`} className="tabular-nums hover:text-school-sidebar">
                    {localPhone(school.phone)}
                  </a>
                </Fact>
              )}
              {firstAddressLine && (
                <Fact icon={<MapPin className="size-4" />} label={t("address")}>
                  {firstAddressLine}
                </Fact>
              )}
            </dl>
          )}
        </div>

        <div className="relative lg:col-span-7">
          {/* the tilted block behind the frame, and a patch of gold dots at its corner */}
          <div aria-hidden className="absolute -inset-2 rotate-2 rounded-3xl bg-school-sidebar sm:-inset-3" />
          <div aria-hidden className="site-dots absolute -top-8 -right-4 size-28 text-sidebar-primary/70 sm:-right-8" />
          <div className="relative">
            <HeroSlider slides={school.slides} name={name} logo={school.logo} />
          </div>

          {latest && (
            <OpenNoticeButton
              notice={latest}
              className="absolute -bottom-7 left-4 flex max-w-[min(20rem,calc(100%-2rem))] items-center gap-3 rounded-xl bg-card p-3 pr-4 text-left shadow-xl ring-1 ring-border transition-transform hover:-translate-y-0.5 sm:-left-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-school-sidebar dark:text-sidebar-primary">
                <Megaphone className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{t("latestNotice")}</span>
                <span className="block truncate text-sm font-semibold">{latest.title}</span>
              </span>
            </OpenNoticeButton>
          )}
        </div>
      </div>
    </section>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-school-sidebar/10 text-school-sidebar dark:bg-white/10 dark:text-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
        <dd className="text-sm font-semibold">{children}</dd>
      </div>
    </div>
  );
}
