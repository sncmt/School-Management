"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import {
  useClassResultSettings,
  useGradingScaleList,
  useSetClassResultSetting,
  type AbsentRule,
  type ClassResultSetting,
  type GradingScale,
  type ResultSystem,
} from "@/lib/school/grading";
import { cn } from "@/lib/utils";

/** How each class's result is worked out this year: graded or marks only, scale, papers, absences. */
export function ResultSettings({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.settings");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const years = useAcademicYears();
  const [yearId, setYearId] = useState<string | undefined>();
  const settings = useClassResultSettings(yearId);
  const scales = useGradingScaleList();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        {(years.data?.length ?? 0) > 1 && (
          <Select value={yearId ?? settings.data?.academicYear.id} onValueChange={setYearId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.data?.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {scales.data?.length === 0 && (
        <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">{t("noScales")}</p>
      )}

      {settings.isPending ? (
        <Skeleton className="h-48" />
      ) : settings.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(settings.error)}</p>
          <Button variant="outline" size="sm" onClick={() => settings.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.class")}</TableHead>
                <TableHead>{t("columns.system")}</TableHead>
                <TableHead>{t("columns.scale")}</TableHead>
                <TableHead>{t("columns.papers")}</TableHead>
                <TableHead>{t("columns.absent")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.data.items.map(({ class: c, setting }) => (
                <SettingRow
                  key={`${settings.data.academicYear.id}-${c.id}-${setting?.id ?? "none"}`}
                  yearId={settings.data.academicYear.id}
                  classId={c.id}
                  className={c.name}
                  setting={setting}
                  scales={scales.data ?? []}
                  canManage={canManage}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("subjectScaleNote")}</p>
    </div>
  );
}

function SettingRow({
  yearId,
  classId,
  className,
  setting,
  scales,
  canManage,
}: {
  yearId: string;
  classId: string;
  className: string;
  setting: ClassResultSetting | null;
  scales: GradingScale[];
  canManage: boolean;
}) {
  const t = useTranslations("school.exams.settings");
  const describeError = useErrorMessage();
  const save = useSetClassResultSetting();

  const initial = {
    resultSystem: setting?.resultSystem ?? ("GRADED" as ResultSystem),
    gradingScaleId: setting?.gradingScaleId ?? (scales.length === 1 ? scales[0].id : ""),
    combinePapers: setting?.combinePapers ?? true,
    absentRule: setting?.absentRule ?? ("FAIL" as AbsentRule),
  };
  const [value, setValue] = useState(initial);
  const dirty = !setting || JSON.stringify(value) !== JSON.stringify(initial);
  const graded = value.resultSystem === "GRADED";
  const missingScale = graded && !value.gradingScaleId;

  const submit = () =>
    save.mutate(
      {
        academicYearId: yearId,
        classId,
        resultSystem: value.resultSystem,
        ...(graded ? { gradingScaleId: value.gradingScaleId } : {}),
        combinePapers: value.combinePapers,
        absentRule: value.absentRule,
      },
      { onSuccess: () => toast.success(t("saved", { name: className })), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <TableRow>
      <TableCell className="font-medium">
        {className}
        {!setting && <div className="text-xs font-normal text-amber-600">{t("notSet")}</div>}
      </TableCell>
      <TableCell>
        <Select
          value={value.resultSystem}
          onValueChange={(v) => setValue((s) => ({ ...s, resultSystem: v as ResultSystem }))}
          disabled={!canManage}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GRADED">{t("systems.GRADED")}</SelectItem>
            <SelectItem value="MARKS_ONLY">{t("systems.MARKS_ONLY")}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {graded ? (
          <Select value={value.gradingScaleId} onValueChange={(v) => setValue((s) => ({ ...s, gradingScaleId: v }))} disabled={!canManage}>
            <SelectTrigger className={cn("w-36", missingScale && "border-amber-500")}>
              <SelectValue placeholder={t("chooseScale")} />
            </SelectTrigger>
            <SelectContent>
              {scales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={value.combinePapers}
            onCheckedChange={(v) => setValue((s) => ({ ...s, combinePapers: v }))}
            disabled={!canManage}
            aria-label={t("columns.papers")}
          />
          {value.combinePapers ? t("combined") : t("separate")}
        </label>
      </TableCell>
      <TableCell>
        <Select value={value.absentRule} onValueChange={(v) => setValue((s) => ({ ...s, absentRule: v as AbsentRule }))} disabled={!canManage}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FAIL">{t("absentRules.FAIL")}</SelectItem>
            <SelectItem value="EXCLUDE">{t("absentRules.EXCLUDE")}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        {canManage && dirty && (
          <Button size="sm" onClick={submit} disabled={save.isPending || missingScale}>
            <Save /> {t("save")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
