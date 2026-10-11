"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAssignClassSubjects, type ClassSubject, type ClassSubjectType } from "@/lib/school/classSubjects";
import { useGroups } from "@/lib/school/groups";
import { useSubjects } from "@/lib/subjects";

const WHOLE_CLASS = "whole";

type Props = {
  open: boolean;
  schoolClass: { id: string; name: string } | null;
  // what the class has already
  assigned: ClassSubject[];
  onClose: () => void;
};

/** Several subjects at once, all for the same group (or the whole class) and of the same type. */
export function AddClassSubjectsDialog({ open, schoolClass, assigned, onClose }: Props) {
  const t = useTranslations("school.classSubjects.addDialog");
  return (
    <Dialog open={open && !!schoolClass} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { className: schoolClass?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && schoolClass && <AddForm classId={schoolClass.id} assigned={assigned} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AddForm({ classId, assigned, onDone }: { classId: string; assigned: ClassSubject[]; onDone: () => void }) {
  const t = useTranslations("school.classSubjects.addDialog");
  const tTypes = useTranslations("school.classSubjects.types");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const assign = useAssignClassSubjects();
  const { data: subjects = [] } = useSubjects("SCHOOL");
  const { data: groupList } = useGroups();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState(WHOLE_CLASS);
  const [type, setType] = useState<ClassSubjectType>("COMPULSORY");
  const [formError, setFormError] = useState<string | null>(null);

  // subjects already in the class for this target can't be added again
  const groupId = target === WHOLE_CLASS ? null : target;
  const taken = useMemo(
    () => new Set(assigned.filter((a) => a.groupId === groupId).map((a) => a.subjectId)),
    [assigned, groupId],
  );

  const shown = subjects.filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || [s.nameEn, s.nameBn, s.code].some((v) => v?.toLowerCase().includes(q));
  });

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const submit = async () => {
    setFormError(null);
    const subjectIds = selected.filter((id) => !taken.has(id));
    if (subjectIds.length === 0) return setFormError(tValidation("chooseSubjects"));
    try {
      await assign.mutateAsync({
        classId,
        items: subjectIds.map((subjectId) => ({ subjectId, type, ...(groupId ? { groupId } : {}) })),
      });
      toast.success(t("added", { count: subjectIds.length }));
      onDone();
    } catch (error) {
      // the server explains a broken rule: a paper and its main subject, two religion subjects...
      setFormError(describeError(error));
    }
  };

  return (
    <div className="space-y-4">
      <FormError message={formError} />

      <div className="space-y-2">
        <Label required>{t("subjects")}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-8" />
        </div>
        <div className="max-h-60 space-y-0.5 overflow-y-auto rounded-md border p-1">
          {shown.map((subject) => {
            const isTaken = taken.has(subject.id);
            return (
              <label
                key={subject.id}
                className={
                  isTaken
                    ? "flex items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground"
                    : "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                }
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  disabled={isTaken}
                  checked={isTaken || selected.includes(subject.id)}
                  onChange={(e) => toggle(subject.id, e.target.checked)}
                />
                <span className="w-12 shrink-0 font-mono text-xs">{subject.code ?? ""}</span>
                <span className="flex-1">
                  {name(subject)}
                  {subject.parent && <span className="text-muted-foreground"> · {name(subject.parent)}</span>}
                </span>
                {isTaken && <Badge variant="outline">{t("assigned")}</Badge>}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{t("selected", { count: selected.filter((id) => !taken.has(id)).length })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label required>{t("for")}</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WHOLE_CLASS}>{t("wholeClass")}</SelectItem>
              {groupList?.items.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {name(group)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label required>{t("type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as ClassSubjectType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPULSORY">{tTypes("COMPULSORY")}</SelectItem>
              <SelectItem value="OPTIONAL">{tTypes("OPTIONAL")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {type === "OPTIONAL" && `${t("optionalHint")} `}
        {t("religionNote")}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={assign.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={assign.isPending}>
          {assign.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
