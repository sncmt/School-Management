"use client";

import { Armchair, Plus, RotateCcw, Settings2, StickyNote, Trash2, UserMinus, Users, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useRooms } from "@/lib/school/rooms";
import {
  useAddPlanRoom,
  useClearSeat,
  useDeleteSeatPlan,
  useFillSeats,
  useMoveSeat,
  useRemovePlanRoom,
  type SeatPlanRoom,
  type SeatPlanStudent,
  type SeatPlanView,
} from "@/lib/school/seatPlan";
import { cn } from "@/lib/utils";
import { classColor } from "./classColors";
import { StickersDialog } from "./StickersDialog";

type Plan = NonNullable<SeatPlanView["plan"]>;

/** The plan: each room's numbered seats; pick a student, then a seat, to move or swap. */
export function PlanView({ view, canManage, onSetup }: { view: SeatPlanView; canManage: boolean; onSetup: () => void }) {
  const t = useTranslations("school.exams.seating.plan");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const plan = view.plan as Plan;
  const move = useMoveSeat();
  const clear = useClearSeat();
  const fill = useFillSeats();
  const [picked, setPicked] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stickers, setStickers] = useState(false);

  const studentOf = useMemo(() => new Map(view.students.map((s) => [s.enrollmentId, s])), [view.students]);
  const classIndex = useMemo(() => new Map(view.classes.map((c, i) => [c.id, i])), [view.classes]);
  const className = (id: string) => view.classes.find((c) => c.id === id)?.name ?? "";
  const seatOf = useMemo(() => new Map(plan.seats.map((s) => [`${s.roomId}:${s.seatNo}`, s.enrollmentId])), [plan.seats]);
  const seated = useMemo(() => new Set(plan.seats.map((s) => s.enrollmentId)), [plan.seats]);

  const grouped = new Set(plan.groups.flat());
  const waiting = view.students.filter((s) => s.onRoll && grouped.has(s.classId) && !seated.has(s.enrollmentId));
  const outside = view.students.filter((s) => s.onRoll && !grouped.has(s.classId)).length;
  const gone = view.students.filter((s) => !s.onRoll && seated.has(s.enrollmentId));
  const totalSeats = plan.rooms.reduce((sum, r) => sum + r.seats, 0);
  const pickedStudent = picked ? studentOf.get(picked) : undefined;
  const busy = move.isPending || clear.isPending || fill.isPending;

  const onSeat = (room: SeatPlanRoom, seatNo: number) => {
    if (!canManage || busy) return;
    const here = seatOf.get(`${room.roomId}:${seatNo}`);
    if (!picked) {
      if (here) setPicked(here);
      return;
    }
    if (here === picked) {
      setPicked(null);
      return;
    }
    // an unseated student can only take an empty seat
    if (here && !seated.has(picked)) {
      setPicked(here);
      return;
    }
    move.mutate(
      { examId: view.exam.id, enrollmentId: picked, roomId: room.roomId, seatNo },
      {
        onSuccess: () => {
          toast.success(here ? t("swapped") : t("moved", { room: room.number, seat: seatNo }));
          setPicked(null);
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  const doClear = (enrollmentId: string) =>
    clear.mutate(
      { examId: view.exam.id, enrollmentId },
      { onSuccess: () => setPicked(null), onError: (e) => toast.error(describeError(e)) },
    );

  const doFill = () =>
    fill.mutate(view.exam.id, {
      onSuccess: (data) => (data.left > 0 ? toast.warning(t("filledSome", { placed: data.placed, left: data.left })) : toast.success(t("filled", { count: data.placed }))),
      onError: (e) => toast.error(describeError(e)),
    });

  const label = (s: SeatPlanStudent) => `${className(s.classId)}${s.section.isDefault ? "" : ` ${s.section.name}`}${s.rollNumber ? ` · ${t("roll", { roll: s.rollNumber })}` : ""}`;

  return (
    <div className="space-y-4">
      {/* summary and tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
        <div className="space-y-1 text-sm">
          <div className="font-medium">
            {t("summary", { seated: format.number(plan.seats.length), seats: format.number(totalSeats), rooms: format.number(plan.rooms.length) })}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("made", { when: format.relativeTime(new Date(plan.generatedAt)), by: plan.generatedBy ?? "—" })}
            {outside > 0 && ` · ${t("outside", { count: outside })}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* anyone who sees the plan may print the stickers */}
          <Button variant="outline" size="sm" onClick={() => setStickers(true)} disabled={plan.seats.length === 0}>
            <StickyNote /> {t("stickers")}
          </Button>
          {canManage && (
            <>
              <AddRoom view={view} />
              <Button variant="outline" size="sm" onClick={onSetup}>
                <Settings2 /> {t("setupAgain")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleting(true)} aria-label={t("delete")}>
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* which colour is which class */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {view.classes
          .filter((c) => grouped.has(c.id))
          .map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", classColor(classIndex.get(c.id) ?? 0).dot)} />
              {c.name}
            </span>
          ))}
      </div>

      {/* waiting for a seat, and seated students who have left */}
      {(waiting.length > 0 || gone.length > 0) && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          {waiting.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("waiting", { count: waiting.length })}</span>
                {canManage && (
                  <Button size="sm" onClick={doFill} disabled={busy}>
                    <Users /> {t("fill")}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {waiting.map((s) => (
                  <button
                    key={s.enrollmentId}
                    type="button"
                    disabled={!canManage}
                    onClick={() => setPicked(picked === s.enrollmentId ? null : s.enrollmentId)}
                    className={cn(
                      "rounded-full border bg-card px-2.5 py-1 text-xs",
                      picked === s.enrollmentId ? "border-primary ring-1 ring-primary" : canManage && "hover:bg-muted",
                    )}
                  >
                    {name(s)} <span className="text-muted-foreground">({label(s)})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {gone.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t("gone", { count: gone.length })}</span>
              <div className="flex flex-wrap gap-1.5">
                {gone.map((s) => (
                  <span key={s.enrollmentId} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pr-1 pl-2.5 text-xs">
                    {name(s)} <span className="text-muted-foreground">({label(s)})</span>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="size-5" onClick={() => doClear(s.enrollmentId)} aria-label={t("clearFor", { name: name(s) })}>
                        <X className="size-3" />
                      </Button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* the picked student: choose a seat */}
      {pickedStudent && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary bg-card p-3 shadow-md">
          <span className="text-sm">
            {t.rich("picked", {
              name: name(pickedStudent),
              info: label(pickedStudent),
              b: (chunks) => <span className="font-semibold">{chunks}</span>,
            })}{" "}
            <span className="text-muted-foreground">{seated.has(pickedStudent.enrollmentId) ? t("pickSeat") : t("pickEmptySeat")}</span>
          </span>
          <div className="flex gap-2">
            {seated.has(pickedStudent.enrollmentId) && (
              <Button variant="outline" size="sm" onClick={() => doClear(pickedStudent.enrollmentId)} disabled={busy}>
                <UserMinus /> {t("unseat")}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
              <RotateCcw /> {t("cancelPick")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {plan.rooms.map((room) => (
          <RoomGrid
            key={room.roomId}
            view={view}
            room={room}
            seatOf={seatOf}
            studentOf={studentOf}
            classIndex={classIndex}
            className={className}
            picked={picked}
            canManage={canManage}
            onSeat={(n) => onSeat(room, n)}
          />
        ))}
      </div>

      <DeletePlanDialog examId={view.exam.id} open={deleting} onClose={() => setDeleting(false)} />
      <StickersDialog view={view} open={stickers} onClose={() => setStickers(false)} />
    </div>
  );
}

function RoomGrid({
  view,
  room,
  seatOf,
  studentOf,
  classIndex,
  className,
  picked,
  canManage,
  onSeat,
}: {
  view: SeatPlanView;
  room: SeatPlanRoom;
  seatOf: Map<string, string>;
  studentOf: Map<string, SeatPlanStudent>;
  classIndex: Map<string, number>;
  className: (id: string) => string;
  picked: string | null;
  canManage: boolean;
  onSeat: (seatNo: number) => void;
}) {
  const t = useTranslations("school.exams.seating.plan");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const removeRoom = useRemovePlanRoom();
  const seats = Array.from({ length: room.seats }, (_, i) => i + 1);
  const used = seats.filter((n) => seatOf.has(`${room.roomId}:${n}`)).length;
  // how many of each class sit here
  const perClass = new Map<string, number>();
  for (const n of seats) {
    const s = studentOf.get(seatOf.get(`${room.roomId}:${n}`) ?? "");
    if (s) perClass.set(s.classId, (perClass.get(s.classId) ?? 0) + 1);
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">
            {t("room", { number: room.number })}
            {room.building && <span className="ml-2 text-sm font-normal text-muted-foreground">{room.building}</span>}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("roomUse", { used, seats: room.seats })}
            {[...perClass].map(([classId, count]) => ` · ${className(classId)} ${count}`).join("")}
            {room.capacity !== room.seats && ` · ${t("capacityChanged", { now: room.capacity })}`}
          </p>
        </div>
        {canManage && used === 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={removeRoom.isPending}
            onClick={() => removeRoom.mutate({ examId: view.exam.id, roomId: room.roomId }, { onError: (e) => toast.error(describeError(e)) })}
          >
            <X /> {t("removeRoom")}
          </Button>
        )}
      </header>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {seats.map((n) => {
          const id = seatOf.get(`${room.roomId}:${n}`);
          const s = id ? studentOf.get(id) : undefined;
          const color = s ? classColor(classIndex.get(s.classId) ?? 0) : null;
          return (
            <button
              key={n}
              type="button"
              disabled={!canManage}
              onClick={() => onSeat(n)}
              aria-pressed={!!id && picked === id}
              aria-label={s ? t("seatOf", { seat: n, name: name(s) }) : t("emptySeat", { seat: n })}
              className={cn(
                "relative min-h-16 rounded-md border p-1.5 text-left text-xs transition-shadow disabled:cursor-default",
                s ? color!.tile : "border-dashed text-muted-foreground",
                s && !s.onRoll && "opacity-50",
                picked && id === picked && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                picked && !id && "border-primary/60 bg-primary/5",
                canManage && "hover:shadow-sm",
              )}
            >
              <span className="absolute top-1 right-1.5 text-[10px] text-muted-foreground tabular-nums">{n}</span>
              {s ? (
                <>
                  <span className="block pr-4 font-semibold">
                    {className(s.classId)}
                    {!s.section.isDefault && ` ${s.section.name}`}
                    {s.rollNumber && <span className="font-normal"> · {s.rollNumber}</span>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 leading-tight">{name(s)}</span>
                </>
              ) : (
                <span className="flex h-full items-center justify-center pt-2">
                  <Armchair className="size-4 opacity-40" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AddRoom({ view }: { view: SeatPlanView }) {
  const t = useTranslations("school.exams.seating.plan");
  const describeError = useErrorMessage();
  const rooms = useRooms();
  const add = useAddPlanRoom();
  const inPlan = new Set(view.plan?.rooms.map((r) => r.roomId));
  const free = (rooms.data?.items ?? []).filter((r) => !inPlan.has(r.id));
  if (free.length === 0) return null;
  return (
    <Select
      value=""
      onValueChange={(roomId) =>
        add.mutate(
          { examId: view.exam.id, roomId },
          { onSuccess: () => toast.success(t("roomAdded")), onError: (e) => toast.error(describeError(e)) },
        )
      }
    >
      <SelectTrigger size="sm" className="w-36" aria-label={t("addRoom")}>
        <Plus className="size-4" />
        <SelectValue placeholder={t("addRoom")} />
      </SelectTrigger>
      <SelectContent>
        {free.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {`${r.number} · ${t("seats", { count: r.capacity })}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeletePlanDialog({ examId, open, onClose }: { examId: string; open: boolean; onClose: () => void }) {
  const t = useTranslations("school.exams.seating.plan.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteSeatPlan();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(examId, {
                onSuccess: () => {
                  toast.success(t("done"));
                  onClose();
                },
                onError: (e) => toast.error(describeError(e)),
              })
            }
          >
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
