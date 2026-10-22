"use client";

import { CreditCard, Fingerprint, Hash, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFieldErrors } from "@/lib/api/errors";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAssignNumbers, useDevicePeople, useSetCard, type DevicePersonRow, type PersonKind } from "@/lib/school/attendanceDevices";
import { useClasses } from "@/lib/school/classes";
import { cn } from "@/lib/utils";

const ALL = "all";

/** Who is on the devices: each student's and teacher's device number, card and fingerprints. */
export function DevicePeople() {
  const t = useTranslations("school.attendance.devices.people");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const classes = useClasses();
  const assign = useAssignNumbers();
  const [kind, setKind] = useState<PersonKind>("student");
  const [classId, setClassId] = useState<string>(ALL);
  const [sectionId, setSectionId] = useState<string>(ALL);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DevicePersonRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(toAsciiDigits(text.trim())), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const sections = classes.data?.items.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const isStudent = kind === "student";
  // a whole school's students at once only when looking for someone by name
  const ready = !isStudent || classId !== ALL || search.length > 0;
  const people = useDevicePeople(
    {
      kind,
      ...(isStudent && classId !== ALL ? { classId } : {}),
      ...(isStudent && classId !== ALL && sectionId !== ALL ? { sectionId } : {}),
      ...(search ? { search } : {}),
    },
    ready,
  );
  const rows = people.data?.items ?? [];
  const numbered = rows.filter((r) => r.person).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="text-sm">
          <div className="font-medium">{t("assignTitle")}</div>
          <div className="text-xs text-muted-foreground">{t("assignHint")}</div>
        </div>
        <Button
          size="sm"
          disabled={assign.isPending}
          onClick={() =>
            assign.mutate(undefined, {
              onSuccess: (r) => (r.assigned > 0 ? toast.success(t("assigned", { count: r.assigned })) : toast.info(t("allHaveNumbers"))),
              onError: (e) => toast.error(describeError(e)),
            })
          }
        >
          <Hash /> {assign.isPending ? t("assigning") : t("assign")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border bg-card p-0.5 text-sm">
          {(["student", "teacher"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn("rounded px-3 py-1", kind === k ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>
        {isStudent && (
          <>
            <Select
              value={classId}
              onValueChange={(v) => {
                setClassId(v);
                setSectionId(ALL);
              }}
            >
              <SelectTrigger className="w-40" aria-label={t("class")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allClasses")}</SelectItem>
                {classes.data?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sections.length > 0 && (
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger className="w-36" aria-label={t("section")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("allSections")}</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("search")} className="pl-8" />
        </div>
        {people.data && rows.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{t("numbered", { numbered: format.number(numbered), total: format.number(rows.length) })}</span>
        )}
      </div>

      {!ready ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("chooseClass")}</p>
      ) : people.isPending ? (
        <Skeleton className="h-48" />
      ) : people.error ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(people.error)}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{isStudent ? t("columns.class") : t("columns.post")}</TableHead>
                <TableHead>{t("columns.number")}</TableHead>
                <TableHead>{t("columns.card")}</TableHead>
                <TableHead>{t("columns.fingers")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{name(r)}</div>
                    {r.admissionNo && <div className="text-xs text-muted-foreground">{r.admissionNo}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{r.info ?? "—"}</TableCell>
                  <TableCell className="font-mono">{r.person?.pin ?? <span className="font-sans text-xs text-muted-foreground">{t("noNumber")}</span>}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => setEditing(r)} className="inline-flex items-center gap-1.5 rounded px-1 text-sm hover:bg-muted">
                      <CreditCard className="size-3.5 text-muted-foreground" />
                      {r.person?.cardNumber ? <span className="font-mono">{r.person.cardNumber}</span> : <span className="text-xs text-muted-foreground">{t("addCard")}</span>}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1 text-sm", !r.person?.fingerprints && "text-muted-foreground")}>
                      <Fingerprint className="size-3.5" /> {format.number(r.person?.fingerprints ?? 0)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("fingerHint")}</p>

      <CardDialog row={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** A person's RFID card number, as the reader shows it (the devices get it). */
function CardDialog({ row, onClose }: { row: DevicePersonRow | null; onClose: () => void }) {
  const t = useTranslations("school.attendance.devices.people.cardDialog");
  const name = useLocalizedName();
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{row ? name(row) : ""}</DialogDescription>
        </DialogHeader>
        {row && <CardForm key={row.id} row={row} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CardForm({ row, onDone }: { row: DevicePersonRow; onDone: () => void }) {
  const t = useTranslations("school.attendance.devices.people.cardDialog");
  const describeError = useErrorMessage();
  const setCard = useSetCard();
  const [card, setValue] = useState(row.person?.cardNumber ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = (cardNumber: string | null) => {
    if (cardNumber !== null && !/^[0-9A-Za-z-]{1,32}$/.test(cardNumber)) {
      setError(t("invalid"));
      return;
    }
    setCard.mutate(
      { kind: row.kind, id: row.id, cardNumber },
      {
        onSuccess: () => {
          toast.success(cardNumber ? t("saved") : t("removed"));
          onDone();
        },
        onError: (e) => setError(getFieldErrors(e).cardNumber ?? describeError(e)),
      },
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(toAsciiDigits(card.trim()) || null);
      }}
      className="space-y-4"
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="card-number">{t("label")}</Label>
        <Input id="card-number" value={card} onChange={(e) => setValue(e.target.value)} maxLength={32} className="font-mono" autoFocus />
        {error ? <p className="text-xs text-destructive">{error}</p> : <p className="text-xs text-muted-foreground">{t("hint")}</p>}
      </div>
      <DialogFooter>
        {row.person?.cardNumber && (
          <Button type="button" variant="outline" className="mr-auto" disabled={setCard.isPending} onClick={() => save(null)}>
            {t("remove")}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDone} disabled={setCard.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={setCard.isPending}>
          {setCard.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
