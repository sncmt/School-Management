"use client";

import { Clock, FlaskConical, MessageSquareText, Search, Send, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { StatCard } from "@/components/data/StatCard";
import { TablePagination } from "@/components/data/TablePagination";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { localPhone } from "@/lib/school/students";
import { useSmsLog, type SmsMessage, type SmsStatus } from "@/lib/school/sms";
import { cn } from "@/lib/utils";

const ALL = "ALL";
const PAGE_SIZES = [20, 50, 100];
const FILTERS = ["SENT", "QUEUED", "FAILED", "CANCELLED"] as const;

const TONES: Record<SmsStatus, string> = {
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-300 [&>span]:bg-emerald-500",
  QUEUED: "bg-navy-soft text-navy ring-navy/15 [&>span]:bg-navy",
  SENDING: "bg-navy-soft text-navy ring-navy/15 [&>span]:bg-navy",
  FAILED: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-950/40 dark:text-red-300 [&>span]:bg-red-500",
  CANCELLED: "bg-muted text-muted-foreground ring-border [&>span]:bg-muted-foreground/60",
};

/** Every SMS of the school, newest first, with this month's numbers. */
export function SmsLogTab() {
  const t = useTranslations("school.sms.log");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const [status, setStatus] = useState<SmsStatus | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);
  const { data, isPending, isError, error, isFetching } = useSmsLog({ page, limit, status, search: search || undefined });

  return (
    <div className="space-y-5">
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Send} label={t("tiles.sent")} value={format.number(data.thisMonth.SENT)} />
          <StatCard icon={MessageSquareText} label={t("tiles.parts")} value={format.number(data.thisMonth.partsSent)} />
          <StatCard icon={Clock} label={t("tiles.waiting")} value={format.number(data.thisMonth.QUEUED + data.thisMonth.SENDING)} />
          <StatCard
            icon={TriangleAlert}
            label={t("tiles.failed")}
            value={format.number(data.thisMonth.FAILED)}
            tone={data.thisMonth.FAILED > 0 ? "alert" : "default"}
          />
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <Tabs
          value={status ?? ALL}
          onValueChange={(v) => {
            setStatus(v === ALL ? undefined : (v as SmsStatus));
            setPage(1);
          }}
        >
          <TabsList className="px-5 pt-4">
            <TabsTrigger value={ALL}>{t("all")}</TabsTrigger>
            {FILTERS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {t(`statuses.${s}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="px-5 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder={t("search")}
              aria-label={t("search")}
              className="pl-9"
            />
          </div>
        </div>

        <div className={cn("border-t transition-opacity", isFetching && !isPending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                {(["when", "to", "message", "type", "status"] as const).map((c) => (
                  <TableHead key={c} className="first:pl-5 last:pr-5">
                    {t(`columns.${c}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {Array.from({ length: 5 }, (_, j) => (
                      <TableCell key={j} className="py-3 first:pl-5 last:pr-5">
                        <Skeleton className="h-3.5 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <MessageRow>{describeError(error)}</MessageRow>
              ) : data.items.length === 0 ? (
                <MessageRow>{t("empty")}</MessageRow>
              ) : (
                data.items.map((sms) => <LogRow key={sms.id} sms={sms} />)
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.meta.total > 0 && (
          <div className="border-t px-5 py-3">
            <TablePagination
              page={data.meta.page}
              limit={data.meta.limit}
              total={data.meta.total}
              totalPages={Math.max(1, data.meta.totalPages)}
              limits={PAGE_SIZES}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
              disabled={isFetching}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

function LogRow({ sms }: { sms: SmsMessage }) {
  const t = useTranslations("school.sms");
  const format = useFormatter();
  const name = useLocalizedName();
  const waiting = sms.status === "QUEUED" && new Date(sms.sendAfter).getTime() > Date.now();

  return (
    <TableRow>
      <TableCell className="py-3 pl-5 align-top text-xs text-muted-foreground">
        {format.dateTime(new Date(sms.sentAt ?? sms.createdAt), { dateStyle: "medium", timeStyle: "short" })}
      </TableCell>
      <TableCell className="py-3 align-top">
        {sms.student && <div className="font-medium">{name(sms.student)}</div>}
        <div className="text-xs text-muted-foreground tabular-nums">{localPhone(sms.phone)}</div>
      </TableCell>
      <TableCell className="max-w-md py-3 align-top whitespace-normal">
        <p className="line-clamp-2 text-sm" title={sms.body}>
          {sms.body}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("parts", { count: sms.parts })}</p>
      </TableCell>
      <TableCell className="py-3 align-top text-sm">{sms.event ? t(`events.${sms.event}.title`) : t("log.byHand")}</TableCell>
      <TableCell className="py-3 pr-5 align-top">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[sms.status])}>
          <span className="size-1.5 rounded-full" />
          {t(`log.statuses.${sms.status}`)}
        </span>
        {sms.status === "SENT" && sms.provider === "TEST" && (
          <div className="mt-1 flex items-center gap-1 text-[13px] text-amber-700 dark:text-amber-400">
            <FlaskConical className="size-3" /> {t("log.test")}
          </div>
        )}
        {waiting && (
          <div className="mt-1 text-[13px] text-muted-foreground">
            {t("log.sendsAt", { time: format.dateTime(new Date(sms.sendAfter), { timeStyle: "short" }) })}
          </div>
        )}
        {sms.error && <div className="mt-1 max-w-48 text-[13px] whitespace-normal text-red-600 dark:text-red-400">{sms.error}</div>}
      </TableCell>
    </TableRow>
  );
}
