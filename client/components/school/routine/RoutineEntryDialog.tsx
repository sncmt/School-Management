"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClassSubjects } from "@/lib/school/classSubjects";
import type { SectionBrief } from "@/lib/school/classes";
import { useWorkingTeachers } from "@/lib/school/pickers";
import {
  useCreateRoutineEntry,
  useDeleteRoutineEntry,
  useTimeLabel,
  useUpdateRoutineEntry,
  type Period,
  type RoutineEntry,
} from "@/lib/school/routine";
import { useSubjectTeachers } from "@/lib/school/subjectTeachers";
import { useWeekdayName } from "../calendar/shared";

const NO_TEACHER = "none"; // Select can't hold an empty value

export type EntrySlot = {
  classId: string;
  // the section whose routine is open, and every section of its class
  section: SectionBrief;
  sections: SectionBrief[];
  weekday: number;
  period: Period;
  // set when editing
  entry: RoutineEntry | null;
};

export function RoutineEntryDialog({ slot, onClose }: { slot: EntrySlot | null; onClose: () => void }) {
  const t = useTranslations("school.routine.entry");
  const weekday = useWeekdayName();
  const time = useTimeLabel();
  const name = useLocalizedName();

  return (
    <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {slot && (
          <>
            <DialogHeader>
              <DialogTitle>{slot.entry ? t("editTitle") : t("addTitle")}</DialogTitle>
              <DialogDescription>
                {weekday(slot.weekday)} · {name(slot.period)} ({time(slot.period.startTime)} – {time(slot.period.endTime)})
              </DialogDescription>
            </DialogHeader>
            <EntryForm key={`${slot.entry?.id ?? "new"}-${slot.weekday}-${slot.period.number}`} slot={slot} onDone={onClose} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({ slot, onDone }: { slot: EntrySlot; onDone: () => void }) {
  const t = useTranslations("school.routine.entry");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const subjects = useClassSubjects(slot.classId);
  const assignments = useSubjectTeachers(slot.classId);
  const teachers = useWorkingTeachers();
  const create = useCreateRoutineEntry();
  const update = useUpdateRoutineEntry();
  const remove = useDeleteRoutineEntry();

  const [classSubjectId, setClassSubjectId] = useState(slot.entry?.classSubjectId ?? "");
  const [teacherId, setTeacherId] = useState(slot.entry?.teacher?.id ?? "");
  const [sectionIds, setSectionIds] = useState<string[]>(
    slot.entry ? slot.entry.sections.map((s) => s.id) : [slot.section.id],
  );
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending || remove.isPending;

  // who teaches each subject in this section (Subject teachers): offered first, and picked for you
  const assignedTo = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of assignments.data?.items ?? []) {
      if (a.section.id !== slot.section.id) continue;
      map.set(a.classSubject.id, [...(map.get(a.classSubject.id) ?? []), a.teacher.id]);
    }
    return map;
  }, [assignments.data, slot.section.id]);
  const assigned = assignedTo.get(classSubjectId) ?? [];

  const chooseSubject = (id: string) => {
    setClassSubjectId(id);
    // keep a teacher the user picked; otherwise take the subject's own teacher
    const own = assignedTo.get(id) ?? [];
    if (!teacherId || !own.includes(teacherId)) setTeacherId(own[0] ?? teacherId);
  };

  const subjectLabel = (s: NonNullable<typeof subjects.data>["items"][number]) =>
    [name(s.subject), s.group && name(s.group), s.type === "OPTIONAL" && t("optional")].filter(Boolean).join(" · ");

  const otherSections = slot.sections.filter((s) => !s.isDefault && s.id !== slot.section.id);

  const save = async () => {
    setError(null);
    if (!classSubjectId) return setError(t("chooseSubject"));
    const body = {
      classId: slot.classId,
      sectionIds,
      weekday: slot.weekday,
      periodNumber: slot.period.number,
      classSubjectId,
      teacherId: teacherId || null,
    };
    try {
      if (slot.entry) await update.mutateAsync({ entryId: slot.entry.id, body });
      else await create.mutateAsync(body);
      toast.success(t("saved"));
      onDone();
    } catch (e) {
      setError(describeError(e));
    }
  };

  const deleteEntry = () => {
    if (!slot.entry) return;
    remove.mutate(slot.entry.id, {
      onSuccess: () => {
        toast.success(t("deleted"));
        onDone();
      },
      onError: (e) => setError(describeError(e)),
    });
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <div className="grid gap-2">
        <Label required>{t("subject")}</Label>
        <Select value={classSubjectId} onValueChange={chooseSubject} disabled={subjects.isPending}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("chooseSubject")} />
          </SelectTrigger>
          <SelectContent>
            {subjects.data?.items.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {subjectLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {subjects.data?.items.length === 0 && <p className="text-xs text-muted-foreground">{t("noSubjects")}</p>}
      </div>

      <div className="grid gap-2">
        <Label>{t("teacher")}</Label>
        <Select value={teacherId || NO_TEACHER} onValueChange={(v) => setTeacherId(v === NO_TEACHER ? "" : v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TEACHER}>{t("noTeacher")}</SelectItem>
            {/* the subject's own teachers first */}
            {[...(teachers.data ?? [])]
              .sort((a, b) => Number(assigned.includes(b.id)) - Number(assigned.includes(a.id)))
              .map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {assigned.includes(teacher.id) && <Star className="size-3 fill-current text-amber-500" />}
                  {name(teacher)}
                  {teacher.designation ? ` · ${teacher.designation}` : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("teacherHint")}</p>
      </div>

      {otherSections.length > 0 && (
        <div className="grid gap-2">
          <Label>{t("together")}</Label>
          <div className="flex flex-wrap gap-3 text-sm">
            {otherSections.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={sectionIds.includes(s.id)}
                  onChange={(e) =>
                    setSectionIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)))
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("togetherHint")}</p>
        </div>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {slot.entry ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={deleteEntry} disabled={busy}>
            <Trash2 /> {t("delete")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {create.isPending || update.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

