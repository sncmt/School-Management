"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  currentYear,
  holidayDays,
  useNationalHolidays,
  type NationalHoliday,
} from "@/lib/platform/holidays";
import { cn } from "@/lib/utils";
import { DeleteHolidayDialog } from "./DeleteHolidayDialog";
import { HolidayFormDialog } from "./HolidayFormDialog";

const COLUMNS = ["dates", "nameEn", "nameBn", "days", "schoolsOpen"] as const;

export function HolidaysList() {
  const t = useTranslations("platform.holidays");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const describeError = useErrorMessage();

  const [year, setYear] = useState(currentYear);
  const { data, isPending, isError, error, isFetching, refetch } = useNationalHolidays(year);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<NationalHoliday | null>(null);
  const [deleting, setDeleting] = useState<NationalHoliday | null>(null);

  const holidays = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus /> {t("add")}
        </Button>
      </div>

      {/* year picker */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setYear((y) => y - 1)}
          aria-label={t("previousYear")}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center text-lg font-semibold">
          {format.number(year, { useGrouping: false })}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setYear((y) => y + 1)}
          aria-label={t("nextYear")}
        >
          <ChevronRight />
        </Button>
        {data && <span className="ml-2 text-sm text-muted-foreground">{t("count", { count: holidays.length, year })}</span>}
      </div>

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{t(`columns.${column}`)}</TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <MessageRow>
                <p>{t("loadFailed")}</p>
                <p className="text-xs">{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : holidays.length === 0 ? (
              <MessageRow>
                <p>{t("empty", { year })}</p>
              </MessageRow>
            ) : (
              holidays.map((holiday) => (
                <HolidayRow
                  key={holiday.id}
                  holiday={holiday}
                  onEdit={() => setEditing(holiday)}
                  onDelete={() => setDeleting(holiday)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <HolidayFormDialog
        open={adding || !!editing}
        holiday={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <DeleteHolidayDialog holiday={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function HolidayRow({
  holiday,
  onEdit,
  onDelete,
}: {
  holiday: NationalHoliday;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("platform.holidays");
  const format = useFormatter();
  const days = holidayDays(holiday);
  // calendar dates: format them as the UTC day the server stored
  const dateOptions = { dateStyle: "medium", timeZone: "UTC" } as const;
  const from = new Date(holiday.fromDate);

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        {days === 1
          ? format.dateTime(from, dateOptions)
          : format.dateTimeRange(from, new Date(holiday.toDate), dateOptions)}
      </TableCell>
      <TableCell>
        <div className="font-medium">{holiday.nameEn}</div>
        {holiday.description && <div className="text-xs text-muted-foreground">{holiday.description}</div>}
      </TableCell>
      <TableCell lang="bn">{holiday.nameBn}</TableCell>
      <TableCell>{t("days", { count: days })}</TableCell>
      <TableCell className="text-muted-foreground">
        {t("schoolsOpen", { count: holiday._count.exclusions })}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
