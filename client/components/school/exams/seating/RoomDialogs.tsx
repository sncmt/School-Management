"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFieldErrors } from "@/lib/api/errors";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateRoom, useCreateRooms, useUpdateRoom, type Room } from "@/lib/school/rooms";

const MAX_SEATS = 500;

/** A whole number from what was typed (Bangla digits too), or null. */
const wholeNumber = (text: string) => {
  const v = toAsciiDigits(text.trim());
  return /^\d+$/.test(v) ? Number(v) : null;
};

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Add one room, or edit one (room given). */
export function RoomFormDialog({ open, room, onClose }: { open: boolean; room: Room | null; onClose: () => void }) {
  const t = useTranslations("school.exams.seating.rooms.form");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{room ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <RoomForm key={room?.id ?? "new"} room={room} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RoomForm({ room, onDone }: { room: Room | null; onDone: () => void }) {
  const t = useTranslations("school.exams.seating.rooms.form");
  const describeError = useErrorMessage();
  const create = useCreateRoom();
  const update = useUpdateRoom();
  const [number, setNumber] = useState(room?.number ?? "");
  const [building, setBuilding] = useState(room?.building ?? "");
  const [seats, setSeats] = useState(room ? String(room.capacity) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capacity = wholeNumber(seats);
    const found: Record<string, string> = {};
    if (!number.trim()) found.number = t("numberRequired");
    if (capacity === null || capacity < 1 || capacity > MAX_SEATS) found.capacity = t("seatsInvalid", { max: MAX_SEATS });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    const body = { number: number.trim(), building: building.trim() || null, capacity: capacity! };
    try {
      if (room) await update.mutateAsync({ roomId: room.id, body });
      else await create.mutateAsync(body);
      toast.success(room ? t("saved", { number: body.number }) : t("added", { number: body.number }));
      onDone();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (fields.number || fields.capacity) setErrors(fields);
      else setFormError(describeError(error));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="room-number" label={t("number")} error={errors.number}>
          <Input id="room-number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={30} placeholder="101" autoFocus />
        </Field>
        <Field id="room-seats" label={t("seats")} error={errors.capacity}>
          <Input id="room-seats" value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" placeholder="40" />
        </Field>
      </div>
      <Field id="room-building" label={t("building")} hint={t("buildingHint")}>
        <Input id="room-building" value={building} onChange={(e) => setBuilding(e.target.value)} maxLength={100} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : room ? t("save") : t("add")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Several rooms at once: a prefix and a range of numbers, all with the same seats. */
export function RoomsBulkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("school.exams.seating.rooms.bulk");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <BulkForm onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function BulkForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("school.exams.seating.rooms.bulk");
  const tForm = useTranslations("school.exams.seating.rooms.form");
  const describeError = useErrorMessage();
  const createMany = useCreateRooms();
  const [prefix, setPrefix] = useState("");
  const [from, setFrom] = useState("101");
  const [to, setTo] = useState("110");
  const [building, setBuilding] = useState("");
  const [seats, setSeats] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const first = wholeNumber(from);
  const last = wholeNumber(to);
  const capacity = wholeNumber(seats);
  const count = first !== null && last !== null && last >= first ? last - first + 1 : 0;
  const rangeError = first === null || last === null ? t("rangeInvalid") : last < first ? t("rangeOrder") : count > 100 ? t("rangeTooBig") : null;
  const seatsError = seats && (capacity === null || capacity < 1 || capacity > MAX_SEATS) ? tForm("seatsInvalid", { max: MAX_SEATS }) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rangeError || seatsError || capacity === null) return;
    setFormError(null);
    try {
      const result = await createMany.mutateAsync({ prefix: prefix.trim(), from: first!, to: last!, building: building.trim() || null, capacity });
      toast.success(t("done", { count: result.created.length }));
      if (result.skipped.length > 0) toast.info(t("skipped", { numbers: result.skipped.join(", ") }));
      onDone();
    } catch (error) {
      setFormError(describeError(error));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={formError} />
      <div className="grid grid-cols-3 gap-3">
        <Field id="bulk-prefix" label={t("prefix")}>
          <Input id="bulk-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={20} placeholder={t("prefixPlaceholder")} />
        </Field>
        <Field id="bulk-from" label={t("from")}>
          <Input id="bulk-from" value={from} onChange={(e) => setFrom(e.target.value)} inputMode="numeric" />
        </Field>
        <Field id="bulk-to" label={t("to")}>
          <Input id="bulk-to" value={to} onChange={(e) => setTo(e.target.value)} inputMode="numeric" />
        </Field>
      </div>
      <p className={rangeError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {rangeError ?? t("preview", { count, first: `${prefix.trim()}${first}`, last: `${prefix.trim()}${last}` })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="bulk-seats" label={t("seatsEach")} error={seatsError ?? undefined}>
          <Input id="bulk-seats" value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" placeholder="40" />
        </Field>
        <Field id="bulk-building" label={tForm("building")}>
          <Input id="bulk-building" value={building} onChange={(e) => setBuilding(e.target.value)} maxLength={100} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={createMany.isPending}>
          {tForm("cancel")}
        </Button>
        <Button type="submit" disabled={createMany.isPending || !!rangeError || !!seatsError || capacity === null}>
          {createMany.isPending ? tForm("saving") : t("add", { count })}
        </Button>
      </DialogFooter>
    </form>
  );
}
