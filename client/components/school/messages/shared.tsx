"use client";

import type { LucideIcon } from "lucide-react";
import { Award, Banknote, CircleX, Clock, GraduationCap, IdCard, UserCheck, UserPlus, UserX, Wallet } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useLocalizedName } from "@/lib/i18n/names";
import { useMoney } from "@/lib/school/finance";
import type { AppNotification, NotificationType } from "@/lib/school/notifications";
import { cn } from "@/lib/utils";

// Pieces shared by the top bar's message menu and the messages page.

// each kind of message: its icon and colour (the words carry the meaning, the colour only helps)
const KINDS: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  STUDENT_ADMITTED: { icon: UserPlus, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
  PAYMENT_RECEIVED: { icon: Banknote, tone: "bg-brand-soft text-brand dark:text-sidebar-primary" },
  PAYMENT_CANCELLED: { icon: CircleX, tone: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" },
  STUDENT_PRESENT: { icon: UserCheck, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
  STUDENT_ABSENT: { icon: UserX, tone: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" },
  STUDENT_LATE: { icon: Clock, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" },
  RESULT_PUBLISHED: { icon: Award, tone: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400" },
  ADMIT_CARD_RELEASED: { icon: IdCard, tone: "bg-navy-soft text-navy" },
  FEE_DUE: { icon: Wallet, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" },
  STUDENT_PROMOTED: { icon: GraduationCap, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
};

/* Where a message leads: for now every message is about a child, and the family home shows it all. */
export const MESSAGE_HREF = "/dashboard";

/** `text(message)` -> its title and sentence in the current language. */
export const useMessageText = () => {
  const t = useTranslations("inbox.types");
  const name = useLocalizedName();
  const money = useMoney();
  const format = useFormatter();
  const day = (key: string | undefined) =>
    key ? format.dateTime(new Date(`${key}T00:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "";

  return ({ type, data }: AppNotification) => {
    const values = {
      student: name(data.student),
      place: [data.className, data.section && `(${data.section})`].filter(Boolean).join(" ") || "—",
      year: data.academicYear ?? "—",
      no: data.admissionNo ?? "—",
      amount: money(data.amount),
      receipt: data.receiptNo ?? "—",
      date: day(data.date),
      exam: data.exam ? name(data.exam) : "",
      className: data.className ?? "—",
      fees: data.fees ?? 0,
      // ICU select in the text: promoted or graduated
      outcome: data.outcome ?? "PROMOTED",
    };
    return { title: t(`${type}.title`, values), body: t(`${type}.body`, values) };
  };
};

/** One message: its icon, title, sentence and how long ago; unread ones marked. */
export function MessageItem({ message, compact }: { message: AppNotification; compact?: boolean }) {
  const t = useTranslations("inbox");
  const text = useMessageText()(message);
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { icon: Icon, tone } = KINDS[message.type];

  return (
    <div className="flex w-full items-start gap-3 text-left">
      <span className={cn("flex shrink-0 items-center justify-center rounded-full", compact ? "size-9" : "size-10", tone)}>
        <Icon className={compact ? "size-4" : "size-[18px]"} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm", message.read ? "font-medium" : "font-semibold")}>{text.title}</span>
          <time dateTime={message.createdAt} className="shrink-0 text-xs text-muted-foreground" title={format.dateTime(new Date(message.createdAt), { dateStyle: "medium", timeStyle: "short" })}>
            {format.relativeTime(new Date(message.createdAt), now)}
          </time>
        </div>
        <p className={cn("text-sm text-muted-foreground", compact && "line-clamp-2")}>{text.body}</p>
      </div>
      {!message.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-600 dark:bg-red-500">
          <span className="sr-only">{t("new")}</span>
        </span>
      )}
    </div>
  );
}
