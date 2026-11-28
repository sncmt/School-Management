"use client";

import {
  Banknote,
  Bell,
  ClipboardCheck,
  FileText,
  GraduationCap,
  House,
  Megaphone,
  Smartphone,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import s from "./HeroPicture.module.css";

// the dashboard's own width; it is drawn at this size and zoomed to fit the window frame
const DRAWN_WIDTH = 960;
// never smaller than this on a short window: below it the words get too small to read
const MIN_ZOOM = 0.5;

const MENU = [
  ["dashboard", House],
  ["students", Users],
  ["teachers", GraduationCap],
  ["attendance", ClipboardCheck],
  ["exams", FileText],
  ["fees", Banknote],
  ["finance", Wallet],
  ["notices", Megaphone],
] as const satisfies readonly (readonly [string, LucideIcon])[];

// today's attendance as a ring: present, late, absent, on leave (of 1,248)
const RING = [
  { key: "present", color: "#0ca30c", dash: "237.5 26.4", offset: "0" },
  { key: "late", color: "#fab219", dash: "8 255.9", offset: "-237.5" },
  { key: "absent", color: "#d03b3b", dash: "13.5 250.4", offset: "-245.5" },
  { key: "leave", color: "oklch(0.8 0.01 200)", dash: "4.9 259", offset: "-259" },
] as const;

/*
 * The hero's picture (styles and layout notes in HeroPicture.module.css). The dashboard is zoomed
 * to the browser frame's width; from 1024px, where the picture sits beside the words, the whole
 * picture also zooms down (to half at most) when the window is too short for it. Measured again
 * when its box changes size and once the fonts are in.
 */
export function HeroPicture() {
  const t = useTranslations("marketing.hero.shot");
  const box = useRef<HTMLDivElement>(null);
  const shot = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const app = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = box.current;
    const picture = shot.current;
    const browser = frame.current;
    const dashboard = app.current;
    if (!outer || !picture || !browser || !dashboard) return;
    const beside = window.matchMedia("(min-width: 64rem)");

    const fit = () => {
      picture.style.zoom = "1";
      dashboard.style.zoom = "1";
      dashboard.style.zoom = (browser.clientWidth / (dashboard.offsetWidth || DRAWN_WIDTH)).toFixed(4);
      if (!beside.matches) return;
      const zoom = Math.min(1, (outer.clientHeight - 8) / picture.offsetHeight, outer.clientWidth / picture.offsetWidth);
      picture.style.zoom = Math.max(MIN_ZOOM, zoom).toFixed(3);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    window.addEventListener("resize", fit);
    void document.fonts?.ready.then(fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  const tint = (background: string, color: string): CSSProperties => ({ background, color });

  return (
    <div ref={box} className={s.box}>
      <div ref={shot} className={s.shot} role="img" aria-label={t("alt")}>
        <div aria-hidden="true">
          <div ref={frame} className={s.browser}>
            <div className={s.chrome}>
              <i />
              <i />
              <i />
              <span className={s.addr} data-ascii-digits>
                {t("address")}
              </span>
            </div>

            <div ref={app} className={s.app}>
              <aside className={s.side}>
                <div className={s.sideHead}>
                  <span className={s.logo}>{t("schoolInitial")}</span>
                  {t("school")}
                </div>
                <nav className={s.nav}>
                  {MENU.map(([key, Icon], i) => (
                    <span key={key} className={cn(s.row, i === 0 && s.rowOn)}>
                      <Icon strokeWidth={1.9} />
                      {t(`menu.${key}`)}
                    </span>
                  ))}
                </nav>
              </aside>

              <div className={s.main}>
                <div className={s.top}>
                  {t("menu.dashboard")}
                  <span className={s.topEnd}>
                    <span className={s.chip}>
                      <Bell strokeWidth={1.9} />
                    </span>
                    <span className={s.avatar}>{t("avatar")}</span>
                  </span>
                </div>

                <div className={s.page}>
                  <section className={s.welcome}>
                    <div>
                      <div className={s.date}>
                        {t("date")}
                        <span className={s.year}>{t("session")}</span>
                      </div>
                      <p className={s.greeting}>{t("greeting")}</p>
                      <p className={s.sub}>{t("sub")}</p>
                    </div>
                    <div className={s.actions}>
                      <span className={cn(s.action, s.actionFirst)}>
                        <Banknote strokeWidth={1.9} />
                        {t("actions.fee")}
                      </span>
                      <span className={s.action}>
                        <ClipboardCheck strokeWidth={1.9} />
                        {t("actions.attendance")}
                      </span>
                      <span className={s.action}>
                        <UserPlus strokeWidth={1.9} />
                        {t("actions.student")}
                      </span>
                      <span className={s.action}>
                        <Megaphone strokeWidth={1.9} />
                        {t("actions.notice")}
                      </span>
                    </div>
                  </section>

                  <div className={s.kpis}>
                    <div className={s.kpi}>
                      <span className={s.label}>
                        <span className={s.icon} style={tint("var(--hp-wash)", "var(--hp-brand)")}>
                          <Users strokeWidth={1.9} />
                        </span>
                        {t("kpi.students")}
                      </span>
                      <b className={s.value}>{t("kpi.studentsValue")}</b>
                      <span className={s.bar}>
                        <i style={{ flex: 652, background: "var(--hp-brand)" }} />
                        <i style={{ flex: 596, background: "var(--mk-gold)" }} />
                      </span>
                      <span className={s.small}>{t("kpi.studentsSub")}</span>
                    </div>
                    <div className={s.kpi}>
                      <span className={s.label}>
                        <span className={s.icon} style={tint("oklch(0.95 0.04 295)", "oklch(0.55 0.2 295)")}>
                          <GraduationCap strokeWidth={1.9} />
                        </span>
                        {t("kpi.teachers")}
                      </span>
                      <b className={s.value}>{t("kpi.teachersValue")}</b>
                      <span className={s.bar}>
                        <i style={{ flex: 50, background: "oklch(0.6 0.2 295)" }} />
                        <i style={{ flex: 2, background: "oklch(0.85 0.01 200)" }} />
                      </span>
                      <span className={s.small}>{t("kpi.teachersSub")}</span>
                    </div>
                    <div className={s.kpi}>
                      <span className={s.label}>
                        <span className={s.icon} style={tint("oklch(0.95 0.05 155)", "oklch(0.55 0.15 155)")}>
                          <ClipboardCheck strokeWidth={1.9} />
                        </span>
                        {t("kpi.present")}
                      </span>
                      <b className={s.value}>{t("kpi.presentValue")}</b>
                      <span className={s.bar}>
                        <i style={{ flex: 93, background: "oklch(0.65 0.16 155)" }} />
                        <i style={{ flex: 7, background: "var(--hp-canvas)" }} />
                      </span>
                      <span className={s.small}>{t("kpi.presentSub")}</span>
                    </div>
                    <div className={s.kpi}>
                      <span className={s.label}>
                        <span className={s.icon} style={tint("oklch(0.96 0.05 80)", "oklch(0.62 0.14 70)")}>
                          <Banknote strokeWidth={1.9} />
                        </span>
                        {t("kpi.month")}
                      </span>
                      <b className={s.value}>{t("kpi.monthValue")}</b>
                      <svg className={s.spark} viewBox="0 0 120 28" preserveAspectRatio="none">
                        <polyline points="0,22 24,18 48,20 72,12 96,14 120,5" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <circle cx="120" cy="5" r="3" fill="currentColor" />
                      </svg>
                      <span className={s.small}>{t("kpi.monthSub")}</span>
                    </div>
                  </div>

                  <div className={s.pair}>
                    <div className={s.panel}>
                      <div className={s.panelHead}>
                        {t("attendance.title")}
                        <small>{t("attendance.link")} →</small>
                      </div>
                      <p className={s.desc}>{t("kpi.presentSub")}</p>
                      <div className={s.ring}>
                        <div className={s.ringChart}>
                          <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" stroke="oklch(0.95 0.005 200)" />
                            {RING.map((part) => (
                              <circle key={part.key} cx="50" cy="50" r="42" fill="none" strokeWidth="10" stroke={part.color} strokeDasharray={part.dash} strokeDashoffset={part.offset} />
                            ))}
                          </svg>
                          <div className={s.ringMiddle}>
                            <b>{t("kpi.presentValue")}</b>
                            {t("attendance.present")}
                          </div>
                        </div>
                        <ul className={s.legend}>
                          {RING.map((part) => (
                            <li key={part.key}>
                              <i style={{ background: part.color }} />
                              <span>{t(`attendance.${part.key}`)}</span>
                              <b>{t(`attendance.${part.key}Count`)}</b>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className={s.panel}>
                      <div className={s.panelHead}>
                        {t("payments.title")}
                        <small>{t("payments.link")} →</small>
                      </div>
                      {(["p1", "p2", "p3"] as const).map((key) => (
                        <div key={key} className={s.payment}>
                          <span className={s.payer}>{t(`payments.${key}.initial`)}</span>
                          <span className={s.who}>
                            <b>{t(`payments.${key}.name`)}</b>
                            <small>{t(`payments.${key}.meta`)}</small>
                          </span>
                          <span className={s.amount}>{t(`payments.${key}.amount`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={s.phone}>
            <span className={s.phoneTag}>
              <Smartphone strokeWidth={1.9} />
              {t("phone.tag")}
            </span>
            <div className={s.screen}>
              <div className={s.screenTop}>{t("phone.child")}</div>
              <div className={s.screenBody}>
                <div className={cn(s.tile, s.tileOk)}>
                  <small>{t("phone.today")}</small>
                  {t("phone.present")}
                </div>
                <div className={s.tile}>
                  <small>{t("phone.fee")}</small>
                  {t("phone.due")}
                  <span className={s.pay}>{t("phone.pay")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.note}>
            <span className={s.noteIcon}>
              <ClipboardCheck strokeWidth={2.2} />
            </span>
            <span>
              <b>{t("note.title")}</b>
              <small>{t("note.sub")}</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
