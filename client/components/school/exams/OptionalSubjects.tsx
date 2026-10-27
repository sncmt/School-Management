"use client";

import { Save, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useOptionalChoices, useSetOptionalChoices, type OptionalChoices } from "@/lib/school/exams";

const NONE = "none";

/** Each student's optional (4th) subject, for classes that have optional subjects. */
export function OptionalSubjects({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.optional");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const classes = useClasses();
  const [classId, setClassId] = useState<string | undefined>();
  const shownClassId = classId ?? classes.data?.items[classes.data.items.length - 1]?.id;
  const choices = useOptionalChoices({ classId: shownClassId });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select value={shownClassId ?? ""} onValueChange={setClassId}>
          <SelectTrigger className="w-40" label={t("class")} required>
            <SelectValue placeholder={t("class")} />
          </SelectTrigger>
          <SelectContent>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {choices.isPending && !!shownClassId ? (
        <Skeleton className="h-48" />
      ) : choices.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(choices.error)}</p>
          <Button variant="outline" size="sm" onClick={() => choices.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : !choices.data ? null : !choices.data.hasOptionalSubjects ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noOptional")}</p>
      ) : (
        <ChoicesEditor key={`${choices.data.class.id}-${choices.dataUpdatedAt}`} data={choices.data} canManage={canManage} />
      )}
    </div>
  );
}

function ChoicesEditor({ data, canManage }: { data: OptionalChoices; canManage: boolean }) {
  const t = useTranslations("school.exams.optional");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const save = useSetOptionalChoices();
  const initial = new Map(data.students.map((s) => [s.enrollmentId, s.choice]));
  const [choice, setChoice] = useState(initial);
  const changed = data.students.filter((s) => choice.get(s.enrollmentId) !== s.choice);
  const optionName = new Map(data.options.map((o) => [o.id, [name(o.subject), o.group && name(o.group)].filter(Boolean).join(" · ")]));

  const submit = () =>
    save.mutate(
      changed.map((s) => ({ enrollmentId: s.enrollmentId, classSubjectId: choice.get(s.enrollmentId) ?? null })),
      { onSuccess: () => toast.success(t("saved", { count: changed.length })), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {data.missingChoices > 0 ? (
          <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="size-4" /> {t("missing", { count: data.missingChoices })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("allChosen")}</span>
        )}
        {canManage && (
          <Button size="sm" onClick={submit} disabled={save.isPending || changed.length === 0}>
            <Save /> {changed.length > 0 ? t("saveCount", { count: changed.length }) : t("save")}
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t("columns.roll")}</TableHead>
              <TableHead>{t("columns.student")}</TableHead>
              <TableHead>{t("columns.group")}</TableHead>
              <TableHead>{t("columns.subject")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t("noStudents")}
                </TableCell>
              </TableRow>
            ) : (
              data.students.map((s) => (
                <TableRow key={s.enrollmentId}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {!s.section.isDefault && `${s.section.name}-`}
                    {s.rollNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{name(s.student)}</TableCell>
                  <TableCell className="text-sm">{s.group ? name(s.group) : "—"}</TableCell>
                  <TableCell>
                    {s.available.length === 0 ? (
                      <span className="text-sm text-muted-foreground">{t("noneOpen")}</span>
                    ) : (
                      <Select
                        value={choice.get(s.enrollmentId) ?? NONE}
                        onValueChange={(v) => setChoice((m) => new Map(m).set(s.enrollmentId, v === NONE ? null : v))}
                        disabled={!canManage}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{t("notChosen")}</SelectItem>
                          {s.available.map((id) => (
                            <SelectItem key={id} value={id}>
                              {optionName.get(id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
