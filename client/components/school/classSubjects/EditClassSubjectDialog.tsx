"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useUpdateClassSubject, type ClassSubject, type ClassSubjectType } from "@/lib/school/classSubjects";
import { useGroups } from "@/lib/school/groups";

const WHOLE_CLASS = "class";
const TYPES: ClassSubjectType[] = ["COMPULSORY", "OPTIONAL", "ELECTIVE"];

/** Who a class subject is for (the whole class or one group) and its kind. The subject itself is a remove + add. */
export function EditClassSubjectDialog({ item, onClose }: { item: ClassSubject | null; onClose: () => void }) {
  const t = useTranslations("school.classSubjects.editDialog");
  const name = useLocalizedName();
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? t("title", { subject: name(item.subject) }) : ""}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {item && <EditForm key={item.id} item={item} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ item, onDone }: { item: ClassSubject; onDone: () => void }) {
  const t = useTranslations("school.classSubjects.editDialog");
  const tTypes = useTranslations("school.classSubjects.types");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const groups = useGroups();
  const update = useUpdateClassSubject();
  const [groupId, setGroupId] = useState<string>(item.group?.id ?? WHOLE_CLASS);
  const [type, setType] = useState<ClassSubjectType>(item.type);
  const [formError, setFormError] = useState<string | null>(null);

  const newGroupId = groupId === WHOLE_CLASS ? null : groupId;
  const changed = newGroupId !== (item.group?.id ?? null) || type !== item.type;

  const submit = () => {
    setFormError(null);
    update.mutate(
      {
        classSubjectId: item.id,
        body: {
          ...(newGroupId !== (item.group?.id ?? null) ? { groupId: newGroupId } : {}),
          ...(type !== item.type ? { type } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("saved", { subject: name(item.subject) }));
          onDone();
        },
        onError: (error) => setFormError(describeError(error)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={formError} />
      <div className="space-y-2">
        <Label required>{t("for")}</Label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={WHOLE_CLASS}>{t("wholeClass")}</SelectItem>
            {(groups.data?.items ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {name(g)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("forHint")}</p>
      </div>
      <div className="space-y-2">
        <Label required>{t("type")}</Label>
        <Select value={type} onValueChange={(v) => setType(v as ClassSubjectType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((ty) => (
              <SelectItem key={ty} value={ty}>
                {tTypes(ty)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
