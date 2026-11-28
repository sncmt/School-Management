import { Banknote, Check, ClipboardCheck, Megaphone, Monitor, Award, Users, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type messages from "@/messages/en.json";
import { HP_PAGE } from "./MarketingHeader";

type Groups = (typeof messages)["marketing"]["features"]["groups"];
// one feature's words: "groups.fees.items.online"
type Item = { [G in keyof Groups]: `groups.${G}.items.${keyof Groups[G]["items"] & string}` }[keyof Groups];

// the six parts of the institution, each with its icon and its four features (marketing.features.groups.*)
const GROUPS: { key: keyof Groups; Icon: LucideIcon; items: Item[] }[] = [
  {
    key: "attendance",
    Icon: ClipboardCheck,
    items: ["groups.attendance.items.class", "groups.attendance.items.devices", "groups.attendance.items.staff", "groups.attendance.items.sms"],
  },
  {
    key: "fees",
    Icon: Banknote,
    items: ["groups.fees.items.setup", "groups.fees.items.counter", "groups.fees.items.online", "groups.fees.items.accounts"],
  },
  {
    key: "exams",
    Icon: Award,
    items: ["groups.exams.items.routine", "groups.exams.items.admit", "groups.exams.items.gpa", "groups.exams.items.cards"],
  },
  {
    key: "students",
    Icon: Users,
    items: ["groups.students.items.admission", "groups.students.items.classes", "groups.students.items.promotion", "groups.students.items.idCards"],
  },
  {
    key: "messages",
    Icon: Megaphone,
    items: ["groups.messages.items.notices", "groups.messages.items.sms", "groups.messages.items.homework", "groups.messages.items.push"],
  },
  {
    key: "online",
    Icon: Monitor,
    items: ["groups.online.items.website", "groups.online.items.pages", "groups.online.items.app", "groups.online.items.bangla"],
  },
];

/*
 * Every feature, on white: a heading on the left, then the six parts of the institution three
 * across (two on a tablet, one on a phone), split by hairlines rather than boxed in cards. Each
 * part has an icon, its name, one line and four features with a green tick.
 */
export async function Features() {
  const t = await getTranslations("marketing.features");

  return (
    <section id="features" aria-labelledby="features-title" className="hp-sans scroll-mt-[68px] border-t border-hp-hair bg-white py-16 sm:py-24 lg:py-28">
      <div className={HP_PAGE}>
        <div className="mb-9 max-w-[720px] sm:mb-14">
          <h2
            id="features-title"
            className="mb-3.5 text-[length:clamp(30px,3.8vw,48px)] leading-[1.12] font-extrabold tracking-[-0.035em] text-balance text-hp-deep [:lang(bn)_&]:leading-[1.3] [:lang(bn)_&]:font-bold [:lang(bn)_&]:tracking-normal"
          >
            {t("title")}
          </h2>
          <p className="text-lg leading-[1.65] text-hp-quiet sm:text-xl">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 border-t border-hp-hair md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map(({ key, Icon, items }, i) => {
            return (
              <div
                key={key}
                className={[
                  "border-b border-hp-hair py-7 md:pr-7 md:pb-9",
                  // a line between columns: every second one on a tablet, the second and third from 1024px
                  i % 2 === 1 ? "md:border-l md:pl-7" : "",
                  i % 3 === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-8",
                ].join(" ")}
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-hp-wash text-hp-brand-ink">
                  <Icon aria-hidden className="size-6" strokeWidth={1.9} />
                </span>
                <h3 className="mt-[18px] mb-1.5 text-[22px] leading-[1.3] font-bold text-hp-deep">{t(`groups.${key}.title`)}</h3>
                <p className="mb-4 text-base leading-[1.6] text-hp-quiet sm:text-[16.5px]">{t(`groups.${key}.body`)}</p>
                <ul className="grid gap-[9px] text-base text-hp-ink sm:text-[16.5px]">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 leading-[1.45]">
                      <Check aria-hidden className="mt-0.5 size-[18px] shrink-0 text-hp-ok" strokeWidth={2.4} />
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-lg text-hp-ink sm:mt-11">
          {t("foot")}
          <a
            href="#pricing"
            className="inline-flex h-12 items-center rounded-xl bg-hp-brand px-[22px] text-[17px] font-semibold text-white transition-colors hover:bg-hp-brand-ink focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
