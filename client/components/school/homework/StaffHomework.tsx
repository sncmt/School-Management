"use client";

import { BookOpenCheck, Paperclip, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { todayKey, useHomeworkList, useHomeworkOptions, type HomeworkRow } from "@/lib/school/homework";
import { Pager } from "../finance/collect/PaymentsTab";
import { HomeworkFormDialog } from "./HomeworkFormDialog";
import { DueLabel, sectionNames, useDay } from "./shared";

const COLUMNS = ["due", "class", "homework", "ticked"] as const;
const PAGE_SIZE = 20;
type When = "UPCOMING" | "PAST" | "ALL";

/** Staff: the homework they gave or may see, and giving new homework. */
export function StaffHomework() {
  const t = useTranslations("school.homework");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const router = useRouter();
  const can = useCan();
  const seesAll = can(["homework:view", "homework:manage"], { any: true });
  const options = useHomeworkOptions();
  const [when, setWhen] = useState<When>("UPCOMING");
  const [subject, setSubject] = useState<string>("ALL");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [giving, setGiving] = useState(false);

  const today = todayKey();
  const yesterday = new Date(Date.parse(today + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);
  const { data, isPending, error, refetch } = useHomeworkList({
    page,
    limit: PAGE_SIZE,
    ...(when === "UPCOMING" ? { from: today, order: "asc" as const } : when === "PAST" ? { to: yesterday, order: "desc" as const } : {}),
    ...(subject !== "ALL" ? { classSubjectId: subject } : {}),
    ...(mine ? { mine: true } : {}),
  });

  const subjects = options.data?.subjects ?? [];
  const canGive = subjects.length > 0;
  const rows = data?.items ?? [];
  const reset = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("description")}</p>
        </div>
        {canGive && (
          <Button onClick={() => setGiving(true)}>
            <Plus /> {t("give")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex h-9 items-center rounded-md border bg-card p-0.5 text-sm">
          {(["UPCOMING", "PAST", "ALL"] as const).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={when === w}
              onClick={() => {
                setWhen(w);
                reset();
              }}
              className={`rounded px-3 py-1 ${when === w ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t(`when.${w}`)}
            </button>
          ))}
        </div>
        {subjects.length > 1 && (
          <Select
            value={subject}
            onValueChange={(v) => {
              setSubject(v);
              reset();
            }}
          >
            <SelectTrigger className="w-56" label={t("subject")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allSubjects")}</SelectItem>
              {subjects.map((o) => (
                <SelectItem key={o.classSubjectId} value={o.classSubjectId}>
                  {`${o.class.name} · ${name(o.subject)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {seesAll && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={mine}
              onCheckedChange={(v) => {
                setMine(v);
                reset();
              }}
            />
            {t("onlyMine")}
          </label>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c}>{t(`columns.${c}`)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  {COLUMNS.map((c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <MessageRow>
                <p>{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>
                <BookOpenCheck className="size-8 text-muted-foreground/50" />
                <p>{when === "UPCOMING" ? t("emptyUpcoming") : t("empty")}</p>
                {!canGive && options.isSuccess && !seesAll && <p className="text-xs">{t("noSubjects")}</p>}
              </MessageRow>
            ) : (
              rows.map((row) => <Row key={row.id} row={row} onOpen={() => router.push(`/homework/${row.id}`)} />)
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && <Pager page={page} totalPages={data.meta.totalPages} onPage={setPage} />}

      <HomeworkFormDialog open={giving} homework={null} onClose={() => setGiving(false)} onCreated={(id) => router.push(`/homework/${id}`)} />
    </div>
  );
}

function Row({ row, onOpen }: { row: HomeworkRow; onOpen: () => void }) {
  const t = useTranslations("school.homework");
  const name = useLocalizedName();
  const day = useDay();
  const sections = sectionNames(row.sections);
  const ticked = row.checked.done + row.checked.late + row.checked.notDone + row.checked.excused;
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="whitespace-nowrap">
        <DueLabel dueDate={row.dueDate} className="text-sm" />
        <div className="text-xs text-muted-foreground">{day(row.dueDate, "weekday")}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{row.class.name}</div>
        {sections && <div className="text-xs text-muted-foreground">{t("sectionsList", { names: sections })}</div>}
      </TableCell>
      <TableCell className="max-w-md">
        <Link href={`/homework/${row.id}`} onClick={(e) => e.stopPropagation()} className="block font-medium hover:underline">
          {row.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{name(row.classSubject.subject)}</span>
          {row.fullMarks !== null && <span>{t("outOf", { marks: row.fullMarks })}</span>}
          {row.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="size-3.5" /> {row.attachmentCount}
            </span>
          )}
          {row.author && <span>{t("by", { name: row.author })}</span>}
        </div>
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        {ticked === 0 ? (
          <span className="text-muted-foreground">{t("notTicked")}</span>
        ) : (
          <span className="tabular-nums">
            {t("tickedSummary", { done: row.checked.done + row.checked.late, notDone: row.checked.notDone })}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">{children}</div>
      </TableCell>
    </TableRow>
  );
}
