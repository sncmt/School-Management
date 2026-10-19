"use client";

import { Eraser, Pencil, Printer, Users, Wand2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolMe } from "@/lib/auth/hooks";
import { getErrorStatus } from "@/lib/api/errors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useExams } from "@/lib/school/exams";
import { useAutoAssignDuties, useClearDuties, useDuties, useSetDuty, type DutiesView, type DutyRoom, type Sitting } from "@/lib/school/invigilators";
import { cn } from "@/lib/utils";

type PrintMode = "roster" | "teachers" | null;

/** An exam's invigilators: each sitting's rooms and who watches them, assigned or by hand. */
export function DutiesTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.seating.duties");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const exams = useExams();
  const [chosen, setChosen] = useState<string | undefined>();
  const list = exams.data?.items ?? [];
  const exam = list.find((e) => e.id === chosen) ?? list.at(-1);
  const duties = useDuties(exam?.id);
  const auto = useAutoAssignDuties();
  const clear = useClearDuties();
  const [perRoom, setPerRoom] = useState<number | null>(null);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [editing, setEditing] = useState<{ sitting: Sitting; room: DutyRoom } | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);

  // print once the chosen printout is on the page, then take it away again
  useEffect(() => {
    if (!printMode) return;
    const done = () => setPrintMode(null);
    window.addEventListener("afterprint", done, { once: true });
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [printMode]);

  if (exams.isPending) return <Skeleton className="h-40" />;
  if (!exam) return <p className="py-8 text-center text-sm text-muted-foreground">{t("noExams")}</p>;

  const data = duties.data;
  const each = perRoom ?? data?.perRoom ?? 1;
  const runAuto = () =>
    auto.mutate(
      { examId: exam.id, perRoom: each },
      {
        onSuccess: (r) => {
          setConfirmAuto(false);
          if (r.missing > 0) toast.warning(t("autoShort", { count: r.missing }));
          else toast.success(t("autoDone", { count: r.total }));
        },
        onError: (e) => {
          setConfirmAuto(false);
          toast.error(describeError(e));
        },
      },
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={exam.id} onValueChange={setChosen}>
          <SelectTrigger className="w-56" aria-label={t("exam")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {list.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {name(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={data.total === 0} onClick={() => setPrintMode("roster")}>
              <Printer /> {t("printRoster")}
            </Button>
            <Button variant="outline" size="sm" disabled={data.total === 0} onClick={() => setPrintMode("teachers")}>
              <Users /> {t("printTeachers")}
            </Button>
          </div>
        )}
      </div>

      {duties.isPending ? (
        <Skeleton className="h-64" />
      ) : duties.error ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {getErrorStatus(duties.error) === 404 ? t("noPlan") : describeError(duties.error)}
        </p>
      ) : data!.sittings.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("noRoutine")}</p>
      ) : (
        <>
          {canManage && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="text-sm">
                <div className="font-medium">{t("summary", { duties: data!.total, sittings: data!.sittings.length })}</div>
                <div className="text-xs text-muted-foreground">{t("autoHint")}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={String(each)} onValueChange={(v) => setPerRoom(Number(v))}>
                  <SelectTrigger className="w-44" aria-label={t("perRoom")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t("perRoomN", { count: n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={auto.isPending} onClick={() => (data!.total > 0 ? setConfirmAuto(true) : runAuto())}>
                  <Wand2 /> {auto.isPending ? t("assigning") : t("auto")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clear.isPending || data!.total === 0}
                  onClick={() => clear.mutate(exam.id, { onSuccess: () => toast.success(t("cleared")), onError: (e) => toast.error(describeError(e)) })}
                  aria-label={t("clear")}
                >
                  <Eraser />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data!.sittings.map((s) => (
              <SittingCard key={s.key} sitting={s} data={data!} canManage={canManage} onEdit={(room) => setEditing({ sitting: s, room })} />
            ))}
          </div>

          <EditDutyDialog examId={exam.id} data={data!} editing={editing} onClose={() => setEditing(null)} />
          {printMode && <DutiesPrint mode={printMode} data={data!} examName={name(exam)} />}
        </>
      )}

      <AlertDialog open={confirmAuto} onOpenChange={(o) => !o && !auto.isPending && setConfirmAuto(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("autoAgainTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("autoAgainDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={auto.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <Button onClick={runAuto} disabled={auto.isPending}>
              {auto.isPending ? t("assigning") : t("auto")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** A sitting as words: "Mon, 2 Nov · 10:00–13:00". */
const useSittingLabel = () => {
  const format = useFormatter();
  return (s: Pick<Sitting, "date" | "startTime" | "endTime">) => {
    const day = format.dateTime(new Date(`${s.date}T00:00:00Z`), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const time = s.startTime ? (s.endTime ? `${s.startTime}–${s.endTime}` : s.startTime) : "";
    return time ? `${day} · ${time}` : day;
  };
};

const usePapers = () => {
  const name = useLocalizedName();
  return (s: Sitting) => s.papers.map((p) => `${p.className}: ${name(p.subject)}`).join(" · ");
};

function SittingCard({ sitting, data, canManage, onEdit }: { sitting: Sitting; data: DutiesView; canManage: boolean; onEdit: (room: DutyRoom) => void }) {
  const t = useTranslations("school.exams.seating.duties");
  const name = useLocalizedName();
  const label = useSittingLabel();
  const papers = usePapers();
  const teacherOf = useMemo(() => new Map(data.teachers.map((x) => [x.id, x])), [data.teachers]);
  const short = sitting.rooms.filter((r) => r.teacherIds.length < data.perRoom).length;

  return (
    <section className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">{label(sitting)}</h3>
          <p className="text-xs text-muted-foreground">{papers(sitting)}</p>
        </div>
        {short > 0 && <span className="text-xs font-medium text-[#b4271f] dark:text-[#ff7a70]">{t("roomsShort", { count: short })}</span>}
      </header>
      {sitting.rooms.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">{t("noRooms")}</p>
      ) : (
        <ul className="divide-y">
          {sitting.rooms.map((r) => (
            <li key={r.roomId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
              <div className="w-36 shrink-0">
                <div className="text-sm font-medium">{t("room", { number: r.number })}</div>
                <div className="text-xs text-muted-foreground">{t("students", { count: r.students })}</div>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {r.teacherIds.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t("nobody")}</span>
                ) : (
                  r.teacherIds.map((id) => {
                    const teacher = teacherOf.get(id);
                    return (
                      <span key={id} className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs">
                        {teacher ? name(teacher) : "—"}
                        {r.ownSubjectTeacherIds.includes(id) && <span className="ml-1 text-[#8a5a00] dark:text-[#ffc94d]">· {t("ownSubject")}</span>}
                      </span>
                    );
                  })
                )}
              </div>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
                  <Pencil /> {t("edit")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Choose the invigilators of one room at one sitting. */
function EditDutyDialog({ examId, data, editing, onClose }: { examId: string; data: DutiesView; editing: { sitting: Sitting; room: DutyRoom } | null; onClose: () => void }) {
  const t = useTranslations("school.exams.seating.duties.editDialog");
  const tCommon = useTranslations("common");
  const label = useSittingLabel();
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("title", { number: editing.room.number }) : ""}</DialogTitle>
          <DialogDescription>{editing ? label(editing.sitting) : ""}</DialogDescription>
        </DialogHeader>
        {editing && <EditDutyForm key={`${editing.sitting.key}:${editing.room.roomId}`} examId={examId} data={data} editing={editing} onDone={onClose} cancel={tCommon("cancel")} />}
      </DialogContent>
    </Dialog>
  );
}

function EditDutyForm({
  examId,
  data,
  editing,
  onDone,
  cancel,
}: {
  examId: string;
  data: DutiesView;
  editing: { sitting: Sitting; room: DutyRoom };
  onDone: () => void;
  cancel: string;
}) {
  const t = useTranslations("school.exams.seating.duties.editDialog");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const set = useSetDuty();
  const [picked, setPicked] = useState<string[]>(editing.room.teacherIds);
  // who is in another room at this sitting
  const busyIn = new Map(editing.sitting.rooms.filter((r) => r.roomId !== editing.room.roomId).flatMap((r) => r.teacherIds.map((id) => [id, r.number] as const)));
  const teachers = [...data.teachers].sort((a, b) => Number(busyIn.has(a.id)) - Number(busyIn.has(b.id)) || a.duties - b.duties || a.nameEn.localeCompare(b.nameEn));

  const save = () =>
    set.mutate(
      { examId, date: editing.sitting.date, startTime: editing.sitting.startTime, roomId: editing.room.roomId, teacherIds: picked },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          onDone();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <div className="space-y-4">
      <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
        {teachers.map((x) => {
          const busy = busyIn.get(x.id);
          const on = picked.includes(x.id);
          return (
            <li key={x.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm", busy && "cursor-not-allowed opacity-60")}>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={on}
                  disabled={!!busy || (!on && picked.length >= 4)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, x.id] : p.filter((id) => id !== x.id)))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{name(x)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[
                      x.designation,
                      t("dutyCount", { count: x.duties }),
                      x.status === "ON_LEAVE" && t("onLeave"),
                      editing.room.ownSubjectTeacherIds.includes(x.id) && t("ownSubject"),
                      busy && t("busy", { number: busy }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={set.isPending}>
          {cancel}
        </Button>
        <Button onClick={save} disabled={set.isPending}>
          {set.isPending ? t("saving") : t("save", { count: picked.length })}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* The printouts: the roster (each sitting, room by room) or each teacher's own list. */
function DutiesPrint({ mode, data, examName }: { mode: Exclude<PrintMode, null>; data: DutiesView; examName: string }) {
  const t = useTranslations("school.exams.seating.duties.print");
  const name = useLocalizedName();
  const me = useSchoolMe();
  const label = useSittingLabel();
  const papers = usePapers();
  const teacherOf = new Map(data.teachers.map((x) => [x.id, x]));
  const header = (
    <header className="mb-[4mm] text-center">
      <div className="text-[15pt] font-bold">{me ? name(me.school) : ""}</div>
      <div className="text-[11pt]">
        {examName} · {mode === "roster" ? t("rosterTitle") : t("teachersTitle")}
      </div>
    </header>
  );
  const cell = "border border-neutral-400 px-[2mm] py-[1mm] text-left align-top";

  const perTeacher = data.teachers
    .map((x) => ({
      teacher: x,
      duties: data.sittings.flatMap((s) => s.rooms.filter((r) => r.teacherIds.includes(x.id)).map((r) => ({ sitting: s, room: r }))),
    }))
    .filter((x) => x.duties.length > 0);

  return createPortal(
    <div className="print-area hidden bg-white text-[10pt] text-black print:block">
      {header}
      {mode === "roster" ? (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={cn(cell, "w-[45mm]")}>{t("when")}</th>
              <th className={cn(cell, "w-[28mm]")}>{t("room")}</th>
              <th className={cn(cell, "w-[18mm]")}>{t("students")}</th>
              <th className={cell}>{t("invigilators")}</th>
              <th className={cn(cell, "w-[30mm]")}>{t("signature")}</th>
            </tr>
          </thead>
          <tbody>
            {data.sittings.flatMap((s) =>
              s.rooms.map((r, i) => (
                <tr key={`${s.key}:${r.roomId}`} className="break-inside-avoid">
                  {i === 0 && (
                    <td className={cell} rowSpan={s.rooms.length}>
                      <div className="font-semibold">{label(s)}</div>
                      <div className="text-[8.5pt] text-neutral-600">{papers(s)}</div>
                    </td>
                  )}
                  <td className={cell}>{r.number}</td>
                  <td className={cell}>{r.students}</td>
                  <td className={cell}>{r.teacherIds.map((id) => (teacherOf.get(id) ? name(teacherOf.get(id)!) : "—")).join(", ") || "—"}</td>
                  <td className={cell} />
                </tr>
              )),
            )}
          </tbody>
        </table>
      ) : (
        <div className="grid grid-cols-2 gap-[4mm]">
          {perTeacher.map(({ teacher, duties }) => (
            <div key={teacher.id} className="break-inside-avoid border border-neutral-400 p-[3mm]">
              <div className="font-semibold">{name(teacher)}</div>
              {teacher.designation && <div className="text-[8.5pt] text-neutral-600">{teacher.designation}</div>}
              <table className="mt-[2mm] w-full border-collapse text-[9pt]">
                <tbody>
                  {duties.map(({ sitting, room }) => (
                    <tr key={`${sitting.key}:${room.roomId}`}>
                      <td className="border-b border-neutral-300 py-[0.8mm] pr-[2mm]">{label(sitting)}</td>
                      <td className="border-b border-neutral-300 py-[0.8mm] font-semibold">{t("roomN", { number: room.number })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
