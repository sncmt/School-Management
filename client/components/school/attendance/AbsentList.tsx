"use client";

import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAbsentees } from "@/lib/school/attendance";
import { todayKey } from "@/lib/school/calendar";
import { useClasses } from "@/lib/school/classes";
import { localPhone } from "@/lib/school/students";
import { StudentAvatar } from "../students/StudentAvatar";

const ALL = "all";

/** The day's absent students with a number to call the family. */
export function AbsentList({ date, onDate }: { date: string; onDate: (date: string) => void }) {
  const t = useTranslations("school.attendance.absent");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const classes = useClasses();
  const [classId, setClassId] = useState<string | undefined>();
  const { data, isPending, isError, error, refetch } = useAbsentees({ date, classId });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => e.target.value && onDate(e.target.value)}
          className="w-44"
          aria-label={t("date")}
        />
        <Select value={classId ?? ALL} onValueChange={(v) => setClassId(v === ALL ? undefined : v)}>
          <SelectTrigger className="w-40" aria-label={t("class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allClasses")}</SelectItem>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{t("count", { count: data.total })}</span>}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.student")}</TableHead>
              <TableHead>{t("columns.class")}</TableHead>
              <TableHead>{t("columns.family")}</TableHead>
              <TableHead>{t("columns.note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <p>{t("loadFailed")}</p>
                  <p className="text-xs">{describeError(error)}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                    {tCommon("tryAgain")}
                  </Button>
                </TableCell>
              </TableRow>
            ) : data.items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t("none")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StudentAvatar photo={item.student.photo} />
                      <div>
                        <Link href={`/students/${item.student.id}`} className="font-medium hover:underline">
                          {name(item.student)}
                        </Link>
                        <div className="text-xs text-muted-foreground">{t("admission", { no: item.student.admissionNo })}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.class.name}
                    {!item.section.isDefault && ` ${item.section.name}`}
                    {item.rollNumber && <span className="text-muted-foreground"> · {t("roll", { roll: item.rollNumber })}</span>}
                  </TableCell>
                  <TableCell>
                    <div>{item.student.guardianName ?? item.student.fatherName}</div>
                    {item.contactPhone ? (
                      <a href={`tel:${item.contactPhone}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <Phone className="size-3" /> {localPhone(item.contactPhone)}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("noPhone")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.note ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
