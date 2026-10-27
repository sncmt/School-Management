"use client";

import { ArrowDown, ArrowUp, Wand2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useRooms } from "@/lib/school/rooms";
import { useGenerateSeatPlan, type SeatPlanView } from "@/lib/school/seatPlan";
import { cn } from "@/lib/utils";
import { classColor } from "./classColors";

const NONE = "none";

/* Each class's group number (1, 2…), or null for a class in no group. */
const groupNumbers = (classes: { id: string }[], groups: string[][]) =>
  Object.fromEntries(classes.map((c) => [c.id, groups.findIndex((g) => g.includes(c.id)) + 1 || null])) as Record<string, number | null>;

/** Groups of classes that share rooms, the rooms in order, then make the plan. */
export function PlanSetup({ view, onDone, onCancel }: { view: SeatPlanView; onDone: () => void; onCancel?: () => void }) {
  const t = useTranslations("school.exams.seating.setup");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const rooms = useRooms();
  const generate = useGenerateSeatPlan();
  const [confirming, setConfirming] = useState(false);

  // each class's group number (1, 2…) or none; from the plan, else the suggestion
  const startGroups = view.plan?.groups ?? view.suggestedGroups;
  const [groupOf, setGroupOf] = useState(() => groupNumbers(view.classes, startGroups));
  // the chosen rooms in fill order; from the plan, else every room in use
  const [roomIds, setRoomIds] = useState<string[] | null>(view.plan ? view.plan.rooms.map((r) => r.roomId) : null);
  const activeRooms = rooms.data?.items ?? [];
  // a room no longer in use drops out
  const chosen = (roomIds ?? activeRooms.map((r) => r.id)).filter((id) => activeRooms.some((r) => r.id === id));

  const groups = useMemo(() => {
    const numbers = [...new Set(Object.values(groupOf).filter((g): g is number => g !== null))].sort((a, b) => a - b);
    // classes stay in level order inside a group
    return numbers.map((n) => view.classes.filter((c) => groupOf[c.id] === n).map((c) => c.id));
  }, [groupOf, view.classes]);

  const needed = view.classes.filter((c) => groupOf[c.id] !== null).reduce((sum, c) => sum + c.students, 0);
  const seats = chosen.reduce((sum, id) => sum + (activeRooms.find((r) => r.id === id)?.capacity ?? 0), 0);
  const maxGroup = Math.max(0, ...Object.values(groupOf).map((g) => g ?? 0));
  const short = needed > seats;

  const toggleRoom = (id: string) => setRoomIds(chosen.includes(id) ? chosen.filter((r) => r !== id) : [...chosen, id]);
  const shift = (id: string, by: -1 | 1) => {
    const list = [...chosen];
    const i = list.indexOf(id);
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setRoomIds(list);
  };

  const run = () =>
    generate.mutate(
      { examId: view.exam.id, roomIds: chosen, groups },
      {
        onSuccess: (data) => {
          toast.success(t("made", { count: data.plan?.seats.length ?? 0 }));
          setConfirming(false);
          onDone();
        },
        onError: (e) => {
          setConfirming(false);
          toast.error(describeError(e));
        },
      },
    );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t("groupsTitle")}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGroupOf(groupNumbers(view.classes, view.suggestedGroups))}
          >
            <Wand2 /> {t("suggest")}
          </Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("groupsHint")}</p>
        {view.classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noClasses")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {view.classes.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className={cn("size-2.5 rounded-full", classColor(i).dot)} />
                <span className="min-w-28 flex-1 text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{t("students", { count: c.students })}</span>
                <Select
                  value={groupOf[c.id] === null ? NONE : String(groupOf[c.id])}
                  onValueChange={(v) => setGroupOf((g) => ({ ...g, [c.id]: v === NONE ? null : Number(v) }))}
                >
                  <SelectTrigger className="w-40" aria-label={t("groupFor", { name: c.name })}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(view.classes.length, maxGroup + 1) }, (_, n) => (
                      <SelectItem key={n + 1} value={String(n + 1)}>
                        {n + 1 > maxGroup ? t("newGroup", { n: n + 1 }) : t("group", { n: n + 1 })}
                      </SelectItem>
                    ))}
                    <SelectItem value={NONE}>{t("notSeated")}</SelectItem>
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
        {groups.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {groups
              .map((g, i) => `${t("group", { n: i + 1 })}: ${g.map((id) => view.classes.find((c) => c.id === id)?.name).join(" + ")}`)
              .join(" · ")}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <h3 className="mb-1 font-semibold">{t("roomsTitle")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{t("roomsHint")}</p>
        {rooms.isPending ? (
          <Skeleton className="h-24" />
        ) : activeRooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noRooms")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-wrap content-start gap-2">
              {activeRooms.map((r) => {
                const on = chosen.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleRoom(r.id)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-left text-sm transition-colors",
                      on ? "border-primary bg-primary/5 ring-1 ring-primary" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className="font-medium text-foreground">{r.number}</span>
                    <span className="ml-1.5 text-xs">{t("seats", { count: r.capacity })}</span>
                  </button>
                );
              })}
            </div>
            {chosen.length > 0 && (
              <ol className="space-y-1 rounded-md border p-2 text-sm">
                {chosen.map((id, i) => {
                  const r = activeRooms.find((x) => x.id === id);
                  if (!r) return null;
                  return (
                    <li key={id} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50">
                      <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                      <span className="flex-1 font-medium">{r.number}</span>
                      <span className="text-xs text-muted-foreground">{t("seats", { count: r.capacity })}</span>
                      <Button variant="ghost" size="icon" className="size-6" disabled={i === 0} onClick={() => shift(id, -1)} aria-label={t("up")}>
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" disabled={i === chosen.length - 1} onClick={() => shift(id, 1)} aria-label={t("down")}>
                        <ArrowDown />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
        <p className={cn("text-sm", short ? "text-destructive" : "text-muted-foreground")}>
          {short
            ? t("short", { needed: format.number(needed), seats: format.number(seats) })
            : t("fits", { needed: format.number(needed), seats: format.number(seats) })}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={generate.isPending}>
              {tCommon("cancel")}
            </Button>
          )}
          <Button
            disabled={generate.isPending || short || needed === 0 || chosen.length === 0}
            onClick={() => (view.plan ? setConfirming(true) : run())}
          >
            {generate.isPending ? t("making") : view.plan ? t("remake") : t("make")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirming} onOpenChange={(open) => !open && !generate.isPending && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("remakeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("remakeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generate.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <Button onClick={run} disabled={generate.isPending}>
              {generate.isPending ? t("making") : t("remake")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
