"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useUpdateExamClass, type Exam, type ExamClass } from "@/lib/school/exams";
import { useSchoolLanguage } from "../NameFields";

export type ExamClassTarget = { exam: Exam; examClass: ExamClass };

/**
 * One class of an exam: the exam's own name in that class ("Test exam" for class 10 when the exam
 * is "Annual"; empty = the exam's name), and whether it is the class's final exam of the year.
 */
export function ExamClassDialog({ target, onClose }: { target: ExamClassTarget | null; onClose: () => void }) {
  const t = useTranslations("school.exams.detail.classDialog");
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{target ? t("title", { class: target.examClass.class.name }) : ""}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {target && <ExamClassForm key={target.examClass.id} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ExamClassForm({ target: { exam, examClass }, onDone }: { target: ExamClassTarget; onDone: () => void }) {
  const t = useTranslations("school.exams.detail.classDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const language = useSchoolLanguage();
  const update = useUpdateExamClass();
  const [nameEn, setNameEn] = useState(examClass.nameEn ?? "");
  const [nameBn, setNameBn] = useState(examClass.nameBn ?? "");
  const [isFinal, setIsFinal] = useState(examClass.isFinal);
  const [formError, setFormError] = useState<string | null>(null);

  const clean = (v: string) => v.trim() || null;
  const namesChanged = clean(nameEn) !== examClass.nameEn || clean(nameBn) !== examClass.nameBn;
  const changed = namesChanged || isFinal !== examClass.isFinal;
  // the school's own language first, as on the other name forms
  const fields = (language === "BN" ? (["nameBn", "nameEn"] as const) : (["nameEn", "nameBn"] as const)).map((f) => ({
    key: f,
    value: f === "nameEn" ? nameEn : nameBn,
    set: f === "nameEn" ? setNameEn : setNameBn,
    label: t(f),
    placeholder: (f === "nameEn" ? exam.nameEn : exam.nameBn) ?? name(exam),
  }));

  const submit = () => {
    setFormError(null);
    update.mutate(
      {
        examId: exam.id,
        classId: examClass.class.id,
        body: {
          ...(namesChanged ? { nameEn: clean(nameEn), nameBn: clean(nameBn) } : {}),
          ...(isFinal !== examClass.isFinal ? { isFinal } : {}),
        },
      },
      {
        onSuccess: (r) => {
          toast.success(t("saved", { class: examClass.class.name }));
          for (const m of r.movedFrom) toast.info(t("moved", { class: m.className, exam: name(m.exam) }));
          onDone();
        },
        onError: (error) => setFormError(describeError(error)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={formError} />
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`exam-class-${f.key}`}>{f.label}</Label>
            <Input id={`exam-class-${f.key}`} value={f.value} maxLength={100} placeholder={f.placeholder} onChange={(e) => f.set(e.target.value)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{t("nameHint")}</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
        <span>
          <span className="block font-medium">{t("isFinal")}</span>
          <span className="block text-xs text-muted-foreground">{t("isFinalHint")}</span>
        </span>
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={update.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={!changed || update.isPending}>
          {update.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
