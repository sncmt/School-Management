"use client";

import { Info, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useRemarks, useSaveRemarks, type RemarksSheet } from "@/lib/school/results";

/** The class teacher's remark for each student of a section, shown on the result card. */
export function RemarksView({ examId, classId }: { examId: string; classId: string }) {
  const t = useTranslations("school.exams.results.remarks");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const classes = useClasses();
  const sections = classes.data?.items.find((c) => c.id === classId)?.sections ?? [];
  const realSections = sections.filter((s) => !s.isDefault);
  const [sectionId, setSectionId] = useState<string | undefined>();
  const shownSection = sectionId ?? (realSections[0] ?? sections[0])?.id;
  const sheet = useRemarks(shownSection ? { examId, classId, sectionId: shownSection } : null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        {realSections.length > 0 && (
          <Select value={shownSection ?? ""} onValueChange={setSectionId}>
            <SelectTrigger className="w-36" label={t("section")} required>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {realSections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t("sectionName", { name: s.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {sheet.isPending && !!shownSection ? (
        <Skeleton className="h-64" />
      ) : sheet.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{describeError(sheet.error)}</p>
          <Button variant="outline" size="sm" onClick={() => sheet.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : sheet.data ? (
        <Editor key={sheet.dataUpdatedAt} sheet={sheet.data} examId={examId} classId={classId} />
      ) : null}
    </div>
  );
}

function Editor({ sheet, examId, classId }: { sheet: RemarksSheet; examId: string; classId: string }) {
  const t = useTranslations("school.exams.results.remarks");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const save = useSaveRemarks();
  const [text, setText] = useState(() => new Map(sheet.students.map((s) => [s.enrollmentId, s.remark ?? ""])));
  const changed = sheet.students.filter((s) => (text.get(s.enrollmentId) ?? "").trim() !== (s.remark ?? ""));

  const submit = () =>
    save.mutate(
      {
        examId,
        classId,
        sectionId: sheet.section.id,
        remarks: changed.map((s) => ({ enrollmentId: s.enrollmentId, remark: (text.get(s.enrollmentId) ?? "").trim() || null })),
      },
      { onSuccess: () => toast.success(t("saved", { count: changed.length })), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-3">
      {!sheet.canEdit && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {t("readOnly")}
        </div>
      )}
      {sheet.canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={save.isPending || changed.length === 0}>
            <Save /> {changed.length ? t("saveCount", { count: changed.length }) : t("save")}
          </Button>
        </div>
      )}
      {sheet.students.length === 0 ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noStudents")}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {sheet.students.map((s) => (
            <li key={s.enrollmentId} className="grid gap-2 px-3 py-2 sm:grid-cols-[14rem_1fr]">
              <div>
                <div className="font-medium">
                  <span className="mr-2 text-muted-foreground tabular-nums">{s.rollNumber ?? "—"}</span>
                  {name(s.student)}
                </div>
                {s.result && (
                  <div className="text-xs text-muted-foreground">
                    {s.result.gpa !== null ? `${t("gpa")} ${format.number(Number(s.result.gpa), { minimumFractionDigits: 2 })} · ` : ""}
                    {s.result.grade ?? (s.result.passed ? t("pass") : t("fail"))}
                    {` · ${t("position", { n: format.number(s.result.sectionPosition) })}`}
                  </div>
                )}
              </div>
              <Textarea
                rows={2}
                maxLength={300}
                value={text.get(s.enrollmentId) ?? ""}
                onChange={(e) => setText((m) => new Map(m).set(s.enrollmentId, e.target.value))}
                disabled={!sheet.canEdit}
                placeholder={t("placeholder")}
                aria-label={t("remark")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
