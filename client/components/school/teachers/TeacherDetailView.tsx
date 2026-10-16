"use client";

import { ArrowLeft, DoorOpen, KeyRound, MoreHorizontal, Palmtree, Pencil, Undo2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/data/ImageUpload";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SetPasswordDialog } from "@/components/auth/SetPasswordDialog";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useRemoveTeacherPhoto,
  useSetTeacherPhoto,
  useTeacher,
  useTeacherLeaves,
  useUpdateTeacher,
  type SectionRef,
  type TeacherDetail,
} from "@/lib/school/teachers";
import { TeacherCredentialsDialog, type TeacherCredentials } from "./TeacherCredentialsDialog";
import { TeacherFormDialog } from "./TeacherFormDialog";
import { TeacherStatusBadge } from "./TeacherStatusBadge";

const localPhone = (phone: string | null) => (phone ?? "").replace(/^\+?880/, "0");

export function TeacherDetailView({ teacherId }: { teacherId: string }) {
  const t = useTranslations("school.teachers.detail");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data: teacher, isPending, isError, error, refetch } = useTeacher(teacherId);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">{t("loadFailed")}</p>
        <p className="text-sm text-muted-foreground">{describeError(error)}</p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/teachers">
              <ArrowLeft /> {t("back")}
            </Link>
          </Button>
          <Button onClick={() => refetch()}>{tCommon("tryAgain")}</Button>
        </div>
      </div>
    );
  }

  return <Detail teacher={teacher} />;
}

function Detail({ teacher }: { teacher: TeacherDetail }) {
  const t = useTranslations("school.teachers.detail");
  const tForm = useTranslations("school.teachers.form");
  const tGender = useTranslations("genders");
  const tStatus = useTranslations("teacherStatuses");
  const format = useFormatter();
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const can = useCan();
  const update = useUpdateTeacher();
  const setPhoto = useSetTeacherPhoto();
  const removePhoto = useRemoveTeacherPhoto();

  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const me = useSchoolMe();
  const [settingPassword, setSettingPassword] = useState(false);
  const [credentials, setCredentials] = useState<TeacherCredentials | null>(null);

  const user = teacher.membership.user;
  const teacherName = name(teacher);
  const working = teacher.status === "ACTIVE" || teacher.status === "ON_LEAVE";
  const date = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium", timeZone: "UTC" }) : null;
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;
  // the automatic section of a class without sections is just the class
  const sectionLabel = (s: SectionRef) => (s.isDefault ? s.class.name : `${s.class.name} ${s.name}`);

  const toggleLeave = () => {
    const status = teacher.status === "ACTIVE" ? "ON_LEAVE" : "ACTIVE";
    update.mutate(
      { teacherId: teacher.id, body: { status } },
      {
        onSuccess: () => toast.success(t("statusChanged", { name: teacherName, status: tStatus(status) })),
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  const actions = {
    edit: can("teacher:update") && working,
    toggleLeave: can("teacher:update") && working,
    // only the school super admin changes a teacher's password
    reset: !!me?.isSuperAdmin && working,
    leave: can("teacher:deactivate") && working,
    photo: can("teacher:update") && working,
  };
  const anyMenuAction = actions.toggleLeave || actions.reset || actions.leave;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/teachers">
          <ArrowLeft /> {t("back")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{teacherName}</h1>
            <TeacherStatusBadge status={teacher.status} />
          </div>
          {teacher.designation && <p className="text-muted-foreground">{teacher.designation}</p>}
          {teacher.leftAt && <p className="text-sm text-muted-foreground">{t("left", { date: date(teacher.leftAt)! })}</p>}
        </div>
        <div className="flex gap-2">
          {actions.edit && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> {t("actions.edit")}
            </Button>
          )}
          {anyMenuAction && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={tForm("editTitle")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {actions.toggleLeave && (
                  <DropdownMenuItem onSelect={toggleLeave} disabled={update.isPending}>
                    {teacher.status === "ACTIVE" ? <Palmtree /> : <Undo2 />}
                    {teacher.status === "ACTIVE" ? t("actions.onLeave") : t("actions.backToWork")}
                  </DropdownMenuItem>
                )}
                {actions.reset && (
                  <DropdownMenuItem onSelect={() => setSettingPassword(true)}>
                    <KeyRound /> {t("actions.changePassword")}
                  </DropdownMenuItem>
                )}
                {actions.leave && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setLeaving(true)}>
                      <DoorOpen /> {t("actions.leave")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title={t("sections.profile")}>
          <Field label={tForm("gender")}>{teacher.gender ? tGender(teacher.gender) : notSet}</Field>
          <Field label={tForm("joiningDate")}>{date(teacher.joiningDate) ?? notSet}</Field>
          <Field label={tForm("qualification")}>{teacher.qualification ?? notSet}</Field>
          <Field label={tForm("specialization")}>{teacher.specialization ?? notSet}</Field>
          <Field label={tForm("mpoIndex")}>{teacher.mpoIndex ?? notSet}</Field>
          <Field label={tForm("nid")}>{teacher.nid ?? notSet}</Field>
        </InfoCard>

        <InfoCard title={t("sections.login")}>
          <Field label={t("loginPhone")}>{localPhone(user.phone)}</Field>
          <Field label={t("loginStatus")}>
            {!working || !user.isActive ? (
              <Badge variant="outline">{t("loginState.disabled")}</Badge>
            ) : (
              <Badge>{t("loginState.active")}</Badge>
            )}
          </Field>
        </InfoCard>

        <InfoCard title={t("photo")}>
          <ImageUpload
            imageUrl={teacher.photo}
            shape="circle"
            fit="cover"
            size={112}
            alt={teacherName}
            disabled={!actions.photo}
            messages={{ saved: t("photoSaved"), removed: t("photoRemoved") }}
            onUpload={(file, onProgress) => setPhoto.mutateAsync({ teacherId: teacher.id, file, onProgress })}
            onRemove={() => removePhoto.mutateAsync(teacher.id)}
          />
        </InfoCard>

        <InfoCard title={teacher.academicYear ? t("sections.assignments", { year: teacher.academicYear.name }) : t("dutiesTitle")}>
          {!teacher.assignments ? (
            <p className="text-sm text-muted-foreground">{t("noYear")}</p>
          ) : (
            <>
              <Field label={t("classTeacherOf")}>
                {teacher.assignments.classTeacherOf.length === 0 ? (
                  <span className="text-muted-foreground">{t("none")}</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {teacher.assignments.classTeacherOf.map((s) => (
                      <Badge key={s.id} variant="secondary">
                        {sectionLabel(s)}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
              <Field label={t("subjects")}>
                {teacher.assignments.subjects.length === 0 ? (
                  <span className="text-muted-foreground">{t("none")}</span>
                ) : (
                  <ul className="space-y-1">
                    {teacher.assignments.subjects.map((a) => (
                      <li key={a.id}>
                        <span className="font-medium">{name(a.classSubject.subject)}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {sectionLabel(a.section)}
                          {a.classSubject.group && ` · ${name(a.classSubject.group)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </>
          )}
        </InfoCard>
      </div>

      <TeacherFormDialog open={editing} teacher={teacher} onClose={() => setEditing(false)} onCredentials={setCredentials} />
      <LeaveDialog teacher={leaving ? teacher : null} onClose={() => setLeaving(false)} />
      <SetPasswordDialog
        account={settingPassword ? { userId: user.id, name: teacherName, login: localPhone(user.phone) } : null}
        onClose={() => setSettingPassword(false)}
      />
      <TeacherCredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function LeaveDialog({ teacher, onClose }: { teacher: TeacherDetail | null; onClose: () => void }) {
  const name = useLocalizedName();
  const t = useTranslations("school.teachers.leaveDialog");
  const tStatus = useTranslations("teacherStatuses");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const leave = useTeacherLeaves();
  const [reason, setReason] = useState<"RESIGNED" | "RETIRED">("RESIGNED");
  const [leftAt, setLeftAt] = useState("");

  const confirm = () => {
    if (!teacher) return;
    leave.mutate(
      { teacherId: teacher.id, body: { status: reason, ...(leftAt ? { leftAt } : {}) } },
      {
        onSuccess: (result) => {
          toast.success(
            t("done", {
              name: name(teacher),
              classTeacher: result.removedAsClassTeacher,
              subjects: result.removedSubjectAssignments,
            }),
          );
          onClose();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  return (
    <AlertDialog open={!!teacher} onOpenChange={(open) => !open && !leave.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: teacher ? name(teacher) : "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label required>{t("reason")}</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as "RESIGNED" | "RETIRED")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESIGNED">{tStatus("RESIGNED")}</SelectItem>
                <SelectItem value="RETIRED">{tStatus("RETIRED")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="leftAt">{t("leftAt")}</Label>
            <Input id="leftAt" type="date" value={leftAt} onChange={(e) => setLeftAt(e.target.value)} />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={leave.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={leave.isPending}>
            {leave.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
