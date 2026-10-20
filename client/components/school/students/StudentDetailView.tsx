"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Banknote,
  Ban,
  GraduationCap,
  IdCard,
  KeyRound,
  MoreHorizontal,
  Pause,
  Pencil,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { ImageUpload } from "@/components/data/ImageUpload";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SetPasswordDialog } from "@/components/auth/SetPasswordDialog";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useGroups } from "@/lib/school/groups";
import {
  localPhone,
  useChangePlacement,
  useRemoveStudentPhoto,
  useSetStudentPhoto,
  useStudent,
  useUpdateStudent,
  type Enrollment,
  type StudentDetail,
  type StudentStatus,
} from "@/lib/school/students";
import { placementSchema, type PlacementInput, type PlacementValues } from "@/zod/student";
import { AdmissionTypeField } from "./AdmissionTypeField";
import { StudentIdCardDialog } from "./idCards/StudentIdCardDialog";
import { StudentStatusBadge } from "./StudentStatusBadge";
import { usePlacementLabel } from "./placement";

/** Loads a student, with loading and error states, then renders `children`. */
export function StudentLoader({
  studentId,
  children,
}: {
  studentId: string;
  children: (student: StudentDetail) => ReactNode;
}) {
  const t = useTranslations("school.students.detail");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data: student, isPending, isError, error, refetch } = useStudent(studentId);

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
            <Link href="/students">
              <ArrowLeft /> {t("back")}
            </Link>
          </Button>
          <Button onClick={() => refetch()}>{tCommon("tryAgain")}</Button>
        </div>
      </div>
    );
  }

  return <>{children(student)}</>;
}

export function StudentDetailView({ studentId }: { studentId: string }) {
  return <StudentLoader studentId={studentId}>{(student) => <Detail student={student} />}</StudentLoader>;
}

// what each status change is called, and which statuses offer it
const STATUS_ACTIONS: { to: StudentStatus; from: StudentStatus[]; icon: typeof Pause; destructive?: boolean }[] = [
  { to: "ACTIVE", from: ["INACTIVE", "SUSPENDED", "GRADUATED"], icon: RotateCcw },
  { to: "SUSPENDED", from: ["ACTIVE"], icon: Pause, destructive: true },
  { to: "GRADUATED", from: ["ACTIVE"], icon: GraduationCap },
  { to: "INACTIVE", from: ["ACTIVE", "SUSPENDED"], icon: Ban, destructive: true },
];

function Detail({ student }: { student: StudentDetail }) {
  const t = useTranslations("school.students.detail");
  const tGender = useTranslations("genders");
  const tReligion = useTranslations("religions");
  const tType = useTranslations("school.students.admissionType");
  const format = useFormatter();
  const name = useLocalizedName();
  const placement = usePlacementLabel();
  const can = useCan();
  const classes = useClasses();
  const setPhoto = useSetStudentPhoto();
  const removePhoto = useRemoveStudentPhoto();

  const [moving, setMoving] = useState(false);
  const [statusTo, setStatusTo] = useState<StudentStatus | null>(null);
  const me = useSchoolMe();
  const [settingPassword, setSettingPassword] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  const studentName = name(student);
  // the other language's name, under the main one
  const otherName = studentName === student.nameEn ? student.nameBn : student.nameEn;
  const currentYearId = classes.data?.academicYear?.id;
  const current = student.enrollments.find((e) => e.academicYearId === currentYearId) ?? null;
  // the ID card is for a student on roll: this year's class, else the latest one
  const cardEnrollment = student.status === "ACTIVE" ? (current ?? student.enrollments.find((e) => e.status === "ACTIVE") ?? null) : null;
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;
  const date = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium", timeZone: "UTC" }) : null;

  const canUpdate = can("student:update");
  const actions = {
    move: canUpdate && student.status === "ACTIVE" && current?.status === "ACTIVE",
    // only the school super admin changes a family's password
    reset: !!me?.isSuperAdmin && !!student.account.userId,
    status: canUpdate ? STATUS_ACTIONS.filter((a) => a.from.includes(student.status)) : [],
  };
  const anyMenuAction = actions.move || actions.reset || actions.status.length > 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/students">
          <ArrowLeft /> {t("back")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <ImageUpload
            imageUrl={student.photo}
            shape="circle"
            fit="cover"
            size={96}
            alt={studentName}
            disabled={!canUpdate}
            messages={{ saved: t("photoSaved"), removed: t("photoRemoved") }}
            onUpload={(file, onProgress) => setPhoto.mutateAsync({ studentId: student.id, file, onProgress })}
            onRemove={() => removePhoto.mutateAsync(student.id)}
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{studentName}</h1>
              <StudentStatusBadge status={student.status} />
            </div>
            <p className="text-muted-foreground">{otherName}</p>
            <p className="text-sm">
              {t("admissionNo", { no: student.admissionNo })}
              {current && <span className="text-muted-foreground"> · {placement(current)}</span>}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {(can("payment:create") || can("student_fee:view")) && (
            <Button variant="outline" asChild>
              <Link href={`/finance?student=${student.id}`}>
                <Banknote /> {t("actions.fees")}
              </Link>
            </Button>
          )}
          {cardEnrollment && (
            <Button variant="outline" onClick={() => setIdCardOpen(true)}>
              <IdCard /> {t("actions.idCard")}
            </Button>
          )}
          {canUpdate && (
            <Button variant="outline" asChild>
              <Link href={`/students/${student.id}/edit`}>
                <Pencil /> {t("actions.edit")}
              </Link>
            </Button>
          )}
          {anyMenuAction && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("moreActions")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {actions.move && (
                  <DropdownMenuItem onSelect={() => setMoving(true)}>
                    <Shuffle /> {t("actions.move")}
                  </DropdownMenuItem>
                )}
                {actions.reset && (
                  <DropdownMenuItem onSelect={() => setSettingPassword(true)}>
                    <KeyRound /> {t("actions.changePassword")}
                  </DropdownMenuItem>
                )}
                {actions.status.length > 0 && (actions.move || actions.reset) && <DropdownMenuSeparator />}
                {actions.status.map(({ to, icon: Icon, destructive }) => (
                  <DropdownMenuItem
                    key={to}
                    variant={destructive ? "destructive" : "default"}
                    onSelect={() => setStatusTo(to)}
                  >
                    <Icon /> {t(`statusActions.${to}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title={t("sections.personal")}>
          <Field label={t("fields.gender")}>{tGender(student.gender)}</Field>
          <Field label={t("fields.religion")}>{student.religion ? tReligion(student.religion) : notSet}</Field>
          <Field label={t("fields.dob")}>{date(student.dob) ?? notSet}</Field>
          <Field label={t("fields.admitted")}>{date(student.admissionDate)}</Field>
        </InfoCard>

        <InfoCard title={t("sections.family")}>
          <Field label={t("fields.father")}>{student.fatherName}</Field>
          <Field label={t("fields.mother")}>{student.motherName}</Field>
          <Field label={t("fields.guardian")}>{student.guardianName ?? notSet}</Field>
          <Field label={t("fields.guardianPhone")}>
            {student.guardianPhone ? localPhone(student.guardianPhone) : notSet}
          </Field>
        </InfoCard>

        <InfoCard title={t("sections.login")}>
          {student.account.hasAccount ? (
            <>
              <Field label={t("fields.loginPhone")}>{localPhone(student.account.loginPhone)}</Field>
              <Field label={t("fields.loginStatus")}>
                {!student.account.isActive ? (
                  <Badge variant="outline">{t("loginState.disabled")}</Badge>
                ) : (
                  <Badge>{t("loginState.active")}</Badge>
                )}
              </Field>
              {student.account.siblingsInSchool > 0 && (
                <Field label={t("fields.siblings")}>
                  {t("siblings", { count: student.account.siblingsInSchool })}
                </Field>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noLogin")}</p>
          )}
        </InfoCard>

        <InfoCard title={t("sections.contact")}>
          <Field label={t("fields.email")}>{student.email ?? notSet}</Field>
          <Field label={t("fields.whatsApp")}>{student.whatsApp ?? notSet}</Field>
          <Field label={t("fields.presentAddress")}>
            {student.presentAddress ? <span className="whitespace-pre-line">{student.presentAddress}</span> : notSet}
          </Field>
          <Field label={t("fields.permanentAddress")}>
            {student.permanentAddress ? (
              <span className="whitespace-pre-line">{student.permanentAddress}</span>
            ) : (
              notSet
            )}
          </Field>
        </InfoCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sections.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {student.enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noEnrollments")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.year")}</TableHead>
                  <TableHead>{t("history.placement")}</TableHead>
                  <TableHead>{t("history.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.academicYear.name}</TableCell>
                    <TableCell>
                      {placement(e)}
                      <span className="ml-2 text-xs text-muted-foreground">{tType(`types.${e.admissionType}`)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === "ACTIVE" ? "default" : "outline"}>
                        {t(`enrollmentStatuses.${e.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlacementDialog student={student} enrollment={moving ? current : null} onClose={() => setMoving(false)} />
      <StatusDialog student={student} to={statusTo} onClose={() => setStatusTo(null)} />
      <SetPasswordDialog
        account={
          settingPassword && student.account.userId && student.account.loginPhone
            ? { userId: student.account.userId, name: t("familyLogin", { name: studentName }), login: localPhone(student.account.loginPhone) }
            : null
        }
        onClose={() => setSettingPassword(false)}
      />
      {cardEnrollment && <StudentIdCardDialog enrollment={cardEnrollment} open={idCardOpen} onClose={() => setIdCardOpen(false)} />}
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

// ---------------------------------------------------------------- placement

const NO_GROUP = "none";
const PLACEMENT_FIELDS: FieldPath<PlacementInput>[] = ["sectionId", "groupId", "rollNumber"];

/* Section, group and roll in the current year; the class stays (another class is a promotion). */
function PlacementDialog({
  student,
  enrollment,
  onClose,
}: {
  student: StudentDetail;
  enrollment: Enrollment | null;
  onClose: () => void;
}) {
  const t = useTranslations("school.students.placement");
  return (
    <Dialog open={!!enrollment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {enrollment && t("description", { class: enrollment.class.name, year: enrollment.academicYear.name })}
          </DialogDescription>
        </DialogHeader>
        {enrollment && <PlacementForm student={student} enrollment={enrollment} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PlacementForm({
  student,
  enrollment,
  onDone,
}: {
  student: StudentDetail;
  enrollment: Enrollment;
  onDone: () => void;
}) {
  const t = useTranslations("school.students.placement");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const tType = useTranslations("school.students.admissionType");
  const name = useLocalizedName();
  const classes = useClasses();
  const groups = useGroups();
  const change = useChangePlacement();
  const [formError, setFormError] = useState<string | null>(null);

  const sections = classes.data?.items.find((c) => c.id === enrollment.class.id)?.sections ?? [];
  const realSections = sections.filter((s) => !s.isDefault);

  const form = useForm<PlacementInput, unknown, PlacementValues>({
    resolver: zodResolver(placementSchema),
    defaultValues: {
      sectionId: enrollment.section.id,
      groupId: enrollment.group?.id ?? "",
      rollNumber: enrollment.rollNumber ?? "",
      admissionType: enrollment.admissionType,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await change.mutateAsync({
        studentId: student.id,
        body: {
          sectionId: values.sectionId,
          groupId: values.groupId || null,
          rollNumber: values.rollNumber || null,
          admissionType: values.admissionType,
        },
      });
      toast.success(t("saved", { name: name(student) }));
      // new <-> old: the admission and re-admission fees swapped
      if (result.admissionFees) {
        toast.info(t("feesSwapped", { type: tType(`types.${values.admissionType}`) }));
        if (result.admissionFees.kept > 0) toast.warning(t("feesKept", { count: result.admissionFees.kept }), { duration: 10_000 });
      }
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, PLACEMENT_FIELDS, describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        {/* a class without sections keeps its automatic one */}
        {realSections.length > 0 && (
          <FormField
            control={form.control}
            name="sectionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("section")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {realSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="groupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("group")}</FormLabel>
              <Select value={field.value || NO_GROUP} onValueChange={(v) => field.onChange(v === NO_GROUP ? "" : v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>{t("noGroup")}</SelectItem>
                  {groups.data?.items.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {name(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rollNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rollNumber")}</FormLabel>
              <FormControl>
                <Input inputMode="numeric" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <AdmissionTypeField control={form.control} name="admissionType" hint={t("admissionTypeHint")} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={change.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ------------------------------------------------------------------- status

function StatusDialog({
  student,
  to,
  onClose,
}: {
  student: StudentDetail;
  to: StudentStatus | null;
  onClose: () => void;
}) {
  const t = useTranslations("school.students.statusDialog");
  const tStatus = useTranslations("studentStatuses");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const update = useUpdateStudent();

  const confirm = () => {
    if (!to) return;
    update.mutate(
      { studentId: student.id, body: { status: to } },
      {
        onSuccess: () => {
          toast.success(t("done", { name: name(student), status: tStatus(to) }));
          onClose();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  return (
    <AlertDialog open={!!to} onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <AlertDialogContent>
        {to && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t(`title.${to}`, { name: name(student) })}</AlertDialogTitle>
              <AlertDialogDescription>{t(`description.${to}`)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={update.isPending}>{tCommon("cancel")}</AlertDialogCancel>
              <Button
                variant={to === "SUSPENDED" || to === "INACTIVE" ? "destructive" : "default"}
                onClick={confirm}
                disabled={update.isPending}
              >
                {update.isPending ? t("working") : t("confirm")}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
