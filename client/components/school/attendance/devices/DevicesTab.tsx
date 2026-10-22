"use client";

import { Fingerprint, MoreHorizontal, Pencil, Plus, Power, RefreshCw, Router, Trash2 } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFieldErrors } from "@/lib/api/errors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  VERIFY_KINDS,
  useCreateDevice,
  useDeleteDevice,
  useDevicePunches,
  useDevices,
  useSyncDevice,
  useUpdateDevice,
  type AttendanceDevice,
  type DeviceServer,
} from "@/lib/school/attendanceDevices";
import { cn } from "@/lib/utils";
import { DevicePeople } from "./DevicePeople";
import { DeviceRulesForm } from "./DeviceRules";

/** The school's fingerprint / RFID terminals, and the people on them. */
export function DevicesTab() {
  const t = useTranslations("school.attendance.devices");
  return (
    <Tabs defaultValue="devices">
      {/* inside the Attendance tabs: the small chip tabs */}
      <TabsList variant="chip">
        <TabsTrigger value="devices">{t("tabs.devices")}</TabsTrigger>
        <TabsTrigger value="people">{t("tabs.people")}</TabsTrigger>
        <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
      </TabsList>
      <TabsContent value="devices">
        <DeviceList />
      </TabsContent>
      <TabsContent value="people">
        <DevicePeople />
      </TabsContent>
      <TabsContent value="rules">
        <DeviceRulesForm />
      </TabsContent>
    </Tabs>
  );
}

/* How to connect devices, whether they are online, what they send. */
function DeviceList() {
  const t = useTranslations("school.attendance.devices");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data, isPending, error, refetch } = useDevices();
  const [editing, setEditing] = useState<AttendanceDevice | "new" | null>(null);

  return (
    <div className="space-y-4">
      {data && <SetupCard server={data.server} />}

      <section className="rounded-xl border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-semibold">{t("title")}</h2>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> {t("add")}
          </Button>
        </header>
        {isPending ? (
          <Skeleton className="m-4 h-24" />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <p>{describeError(error)}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {tCommon("tryAgain")}
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Router className="size-8 text-muted-foreground/50" />
            {t("empty")}
          </div>
        ) : (
          <ul className="divide-y">
            {data.items.map((d) => (
              <DeviceRow key={d.id} device={d} onEdit={() => setEditing(d)} />
            ))}
          </ul>
        )}
      </section>

      <PunchesPanel />
      <DeviceDialog device={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/* What to type into the device. */
function SetupCard({ server }: { server: DeviceServer }) {
  const t = useTranslations("school.attendance.devices.setup");
  return (
    <section className="space-y-3 rounded-xl border border-dashed bg-card p-4 text-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <Fingerprint className="size-4" /> {t("title")}
      </h2>
      {server.host ? (
        <dl className="grid w-fit grid-cols-[auto_auto] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{t("address")}</dt>
          <dd className="font-mono font-semibold">{server.host}</dd>
          <dt className="text-muted-foreground">{t("port")}</dt>
          <dd className="font-mono font-semibold">{server.port ?? 80}</dd>
        </dl>
      ) : (
        <p className="text-muted-foreground">{t("notReady")}</p>
      )}
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
        <li>{t("step3")}</li>
        <li>{t("step4")}</li>
      </ol>
    </section>
  );
}

function DeviceRow({ device: d, onEdit }: { device: AttendanceDevice; onEdit: () => void }) {
  const t = useTranslations("school.attendance.devices");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const update = useUpdateDevice();
  const sync = useSyncDevice();
  const [deleting, setDeleting] = useState(false);
  const state = !d.isActive ? "stopped" : d.online ? "online" : "offline";

  return (
    <li className={cn("flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3", !d.isActive && "text-muted-foreground")}>
      <div className="min-w-48 flex-1">
        <div className="font-medium">{d.name}</div>
        <div className="text-xs text-muted-foreground">
          {[d.location, t("serial", { sn: d.serialNumber }), d.firmware].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="w-40 text-sm">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", state === "online" ? "bg-[#0ca30c]" : state === "offline" ? "bg-[#d03b3b]" : "bg-muted-foreground/40")} />
          {t(`state.${state}`)}
        </div>
        <div className="text-xs text-muted-foreground">
          {d.lastSeenAt ? t("lastSeen", { when: format.relativeTime(new Date(d.lastSeenAt), now) }) : t("neverSeen")}
        </div>
      </div>
      <div className="w-36 text-sm tabular-nums">
        <div>{t("today", { count: d.punchesToday })}</div>
        {d.pending > 0 && <div className="text-xs text-muted-foreground">{t("pending", { count: d.pending })}</div>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={tCommon("actions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> {t("edit")}
          </DropdownMenuItem>
          {d.isActive && (
            <DropdownMenuItem
              onSelect={() =>
                sync.mutate(d.id, {
                  onSuccess: (r) => toast.success(t("syncing", { name: d.name, count: r.queued })),
                  onError: (e) => toast.error(describeError(e)),
                })
              }
            >
              <RefreshCw /> {t("sync")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() =>
              update.mutate(
                { deviceId: d.id, body: { isActive: !d.isActive } },
                { onSuccess: () => toast.success(d.isActive ? t("stopped", { name: d.name }) : t("started", { name: d.name })), onError: (e) => toast.error(describeError(e)) },
              )
            }
          >
            <Power /> {d.isActive ? t("stop") : t("start")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog device={deleting ? d : null} onClose={() => setDeleting(false)} />
    </li>
  );
}

/* The latest punches from every device, refreshed every few seconds. */
function PunchesPanel() {
  const t = useTranslations("school.attendance.devices.punches");
  const format = useFormatter();
  const name = useLocalizedName();
  const { data, isPending } = useDevicePunches();
  const when = (iso: string) =>
    format.dateTime(new Date(iso), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Dhaka" });

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        {data && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {(
              [
                ["studentsIn", data.today.studentsIn],
                ["studentsLate", data.today.studentsLate],
                ["studentsAbsent", data.today.studentsAbsent],
                ["teachersIn", data.today.teachersIn],
              ] as const
            ).map(([k, n]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{t(`today.${k}`)}</dt>
                <dd className="font-semibold tabular-nums">{format.number(n)}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>
      {isPending ? (
        <Skeleton className="m-4 h-24" />
      ) : !data || data.items.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("time")}</TableHead>
              <TableHead>{t("device")}</TableHead>
              <TableHead>{t("person")}</TableHead>
              <TableHead>{t("by")}</TableHead>
              <TableHead>{t("result")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((p) => {
              const kind = p.verifyType !== null ? VERIFY_KINDS[p.verifyType] : undefined;
              return (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{when(p.punchedAt)}</TableCell>
                  <TableCell>{p.device.name}</TableCell>
                  <TableCell>
                    {p.person ? (
                      <>
                        <div className="font-medium">{name(p.person)}</div>
                        <div className="text-xs text-muted-foreground">{[p.person.info, `#${p.pin}`].filter(Boolean).join(" · ")}</div>
                      </>
                    ) : (
                      <span className="font-mono">{p.pin}</span>
                    )}
                  </TableCell>
                  <TableCell>{kind ? t(`verify.${kind}`) : t("verify.other")}</TableCell>
                  <TableCell>
                    <OutcomeLabel outcome={p.outcome} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

// what a punch became, in words (with a dot of the status colour, never colour alone)
type OutcomeKey = "in" | "late" | "out" | "repeat" | "unknown" | "notOnRoll" | "dayOff" | "noYear" | "error";
const OUTCOMES: Record<string, { key: OutcomeKey; dot: string }> = {
  STUDENT_IN: { key: "in", dot: "bg-[#0ca30c]" },
  TEACHER_IN: { key: "in", dot: "bg-[#0ca30c]" },
  STUDENT_LATE: { key: "late", dot: "bg-[#fab219]" },
  TEACHER_LATE: { key: "late", dot: "bg-[#fab219]" },
  STUDENT_OUT: { key: "out", dot: "bg-muted-foreground/60" },
  TEACHER_OUT: { key: "out", dot: "bg-muted-foreground/60" },
  STUDENT_REPEAT: { key: "repeat", dot: "bg-muted-foreground/30" },
  TEACHER_REPEAT: { key: "repeat", dot: "bg-muted-foreground/30" },
  UNKNOWN_PERSON: { key: "unknown", dot: "bg-[#d03b3b]" },
  NOT_ON_ROLL: { key: "notOnRoll", dot: "bg-[#d03b3b]" },
  DAY_OFF: { key: "dayOff", dot: "bg-muted-foreground/30" },
  NO_YEAR: { key: "noYear", dot: "bg-[#d03b3b]" },
  ERROR: { key: "error", dot: "bg-[#d03b3b]" },
};

function OutcomeLabel({ outcome }: { outcome: string | null }) {
  const t = useTranslations("school.attendance.devices.punches.outcomes");
  const o = outcome ? OUTCOMES[outcome] : undefined;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span className={cn("size-2 rounded-full", o?.dot ?? "bg-muted-foreground/30")} />
      {o ? t(o.key) : t("waiting")}
    </span>
  );
}

/** Add a device (by its serial number) or rename one. */
function DeviceDialog({ device, onClose }: { device: AttendanceDevice | "new" | null; onClose: () => void }) {
  const t = useTranslations("school.attendance.devices.form");
  return (
    <Dialog open={device !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{device === "new" ? t("addTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {device !== null && <DeviceForm key={device === "new" ? "new" : device.id} device={device === "new" ? null : device} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DeviceForm({ device, onDone }: { device: AttendanceDevice | null; onDone: () => void }) {
  const t = useTranslations("school.attendance.devices.form");
  const describeError = useErrorMessage();
  const create = useCreateDevice();
  const update = useUpdateDevice();
  const [serialNumber, setSerial] = useState(device?.serialNumber ?? "");
  const [name, setName] = useState(device?.name ?? "");
  const [location, setLocation] = useState(device?.location ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!device && !/^[A-Za-z0-9_-]{4,64}$/.test(serialNumber.trim())) found.serialNumber = t("serialInvalid");
    if (!name.trim()) found.name = t("nameRequired");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      if (device) await update.mutateAsync({ deviceId: device.id, body: { name: name.trim(), location: location.trim() || null } });
      else await create.mutateAsync({ serialNumber: serialNumber.trim(), name: name.trim(), location: location.trim() || null });
      toast.success(device ? t("saved") : t("added", { name: name.trim() }));
      onDone();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) setErrors(fields);
      else setErrors({ form: describeError(error) });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {errors.form && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}
      <div className="space-y-1.5">
        <Label htmlFor="device-sn">{t("serial")}</Label>
        <Input id="device-sn" value={serialNumber} disabled={!!device} onChange={(e) => setSerial(e.target.value)} maxLength={64} className="font-mono" autoFocus={!device} />
        {errors.serialNumber ? <p className="text-xs text-destructive">{errors.serialNumber}</p> : <p className="text-xs text-muted-foreground">{t("serialHint")}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="device-name">{t("name")}</Label>
        <Input id="device-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t("namePlaceholder")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="device-location">{t("location")}</Label>
        <Input id="device-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} placeholder={t("locationPlaceholder")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : device ? t("save") : t("add")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteDialog({ device, onClose }: { device: AttendanceDevice | null; onClose: () => void }) {
  const t = useTranslations("school.attendance.devices.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteDevice();
  return (
    <AlertDialog open={!!device} onOpenChange={(o) => !o && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: device?.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              device &&
              remove.mutate(device.id, {
                onSuccess: () => {
                  toast.success(t("done", { name: device.name }));
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
