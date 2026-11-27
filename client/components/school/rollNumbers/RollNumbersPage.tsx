"use client";

import { ListOrdered, RotateCcw, Save, Wand2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHero } from "@/components/layout/PageHero";
import { TrackSwitch } from "@/components/school/years/TrackSwitch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFieldErrors } from "@/lib/api/errors";
import { useCan } from "@/lib/auth/hooks";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { currentYearOf, useAcademicYears, yearsOfTrack } from "@/lib/school/academicYears";
import { classesOfTrack, useClasses } from "@/lib/school/classes";
import { useRollSheet, useSaveRolls, type RollRow, type RollSheet } from "@/lib/school/rollNumbers";
import { useTrack } from "@/lib/school/tracks";
import { cn } from "@/lib/utils";

const ALL = "all";
// what the server takes: letters, digits and dashes, up to 10
const ROLL_PATTERN = /^[A-Za-z0-9-]{1,10}$/;

/**
 * Roll numbers for a whole class (or one section of it) in an academic year: type them in,
 * or number everyone automatically, then save them all at once.
 */
export function RollNumbersPage() {
  const t = useTranslations("school.rollNumbers");
  const years = useAcademicYears();
  const classes = useClasses();

  // school or college (an institution with both): its years and classes
  const { track, setTrack: switchTrack } = useTrack();
  const trackYears = yearsOfTrack(years.data, track);
  const trackClasses = classesOfTrack(classes.data?.items, track);
  const [chosenYearId, setYearId] = useState<string | undefined>();
  const [chosenClassId, setClassId] = useState<string | undefined>();
  const [sectionId, setSectionId] = useState<string>(ALL);

  const year = trackYears.find((y) => y.id === chosenYearId) ?? currentYearOf(trackYears, track) ?? trackYears[0];
  const schoolClass = trackClasses.find((c) => c.id === chosenClassId) ?? trackClasses[0];
  // a class without sections of its own has one hidden section: nothing to choose
  const realSections = schoolClass?.sections.filter((s) => !s.isDefault) ?? [];
  const shownSectionId = realSections.some((s) => s.id === sectionId) ? sectionId : ALL;

  const setTrack = (next: typeof track) => {
    switchTrack(next);
    setYearId(undefined);
    setClassId(undefined);
    setSectionId(ALL);
  };

  const query =
    year && schoolClass
      ? { academicYearId: year.id, classId: schoolClass.id, ...(shownSectionId !== ALL ? { sectionId: shownSectionId } : {}) }
      : null;
  const sheet = useRollSheet(query);

  return (
    <div className="flex flex-1 flex-col gap-2 md:min-h-[calc(100svh-6.25rem)]">
      <PageHero title={t("title")} description={t("description")} />

      <div className="flex flex-1 flex-col rounded-lg border bg-card">
        {/* what is being numbered */}
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <TrackSwitch value={track} onChange={setTrack} className="self-end" />
          {trackYears.length > 1 && (
            <Select value={year?.id ?? ""} onValueChange={setYearId}>
              <SelectTrigger className="w-40" label={t("year")} required>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trackYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.isCurrent ? t("currentYear", { name: y.name }) : y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={schoolClass?.id ?? ""}
            onValueChange={(v) => {
              setClassId(v);
              // the old section belongs to another class
              setSectionId(ALL);
            }}
            disabled={trackClasses.length === 0}
          >
            <SelectTrigger className="w-44" label={t("class")} required>
              <SelectValue placeholder={t("chooseClass")} />
            </SelectTrigger>
            <SelectContent>
              {trackClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {realSections.length > 0 && (
            <Select value={shownSectionId} onValueChange={setSectionId}>
              <SelectTrigger className="w-44" label={t("section")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allSections")}</SelectItem>
                {realSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {years.isSuccess && trackYears.length === 0 ? (
          <Empty text={t("noYear")} />
        ) : classes.isSuccess && trackClasses.length === 0 ? (
          <Empty text={t("noClasses")} />
        ) : sheet.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : sheet.isError ? (
          <ErrorState error={sheet.error} onRetry={() => sheet.refetch()} />
        ) : (
          // a new class, section or year starts from what is saved
          <RollEditor key={JSON.stringify(query)} sheet={sheet.data} showSections={realSections.length > 0 && shownSectionId === ALL} />
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useTranslations("school.rollNumbers");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
      <p>{t("loadFailed")}</p>
      <p className="text-xs">{describeError(error)}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {tCommon("tryAgain")}
      </Button>
    </div>
  );
}

type Order = "current" | "name" | "admissionNo";

function RollEditor({ sheet, showSections }: { sheet: RollSheet; showSections: boolean }) {
  const t = useTranslations("school.rollNumbers");
  const format = useFormatter();
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const canEdit = useCan()("student:update");
  const save = useSaveRolls();

  const saved = useMemo(() => new Map(sheet.items.map((r) => [r.enrollmentId, r.rollNumber ?? ""])), [sheet]);
  const [rolls, setRolls] = useState<Record<string, string>>(() => Object.fromEntries(saved));
  const [serverErrors, setServerErrors] = useState<Set<string>>(new Set());

  const rows = sheet.items;
  const hasGroups = rows.some((r) => r.group);
  const changed = rows.filter((r) => (rolls[r.enrollmentId] ?? "") !== (saved.get(r.enrollmentId) ?? ""));

  // the problems as typed: a bad roll, or the same roll twice in one section
  const problems = useMemo(() => {
    const bad = new Set<string>();
    const twice = new Set<string>();
    const seen = new Map<string, string>();
    for (const r of rows) {
      const roll = (rolls[r.enrollmentId] ?? "").trim();
      if (!roll) continue;
      if (!ROLL_PATTERN.test(roll)) bad.add(r.enrollmentId);
      const key = `${r.section.id}:${roll.toUpperCase()}`;
      const other = seen.get(key);
      if (other) {
        twice.add(other);
        twice.add(r.enrollmentId);
      } else seen.set(key, r.enrollmentId);
    }
    return { bad, twice };
  }, [rows, rolls]);
  const blocked = problems.bad.size > 0 || problems.twice.size > 0;
  const missing = rows.filter((r) => !(rolls[r.enrollmentId] ?? "").trim()).length;

  const setRoll = (id: string, value: string) => {
    setRolls((prev) => ({ ...prev, [id]: toAsciiDigits(value).replace(/\s+/g, "") }));
    setServerErrors((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // 1, 2, 3… in each section, in the chosen order
  const numberAll = (order: Order) => {
    const sorted = [...rows];
    if (order === "name") sorted.sort((a, b) => name(a.student).localeCompare(name(b.student)));
    if (order === "admissionNo") {
      sorted.sort((a, b) => a.student.admissionNo.localeCompare(b.student.admissionNo, undefined, { numeric: true }));
    }
    const counter = new Map<string, number>();
    const next: Record<string, string> = {};
    for (const r of sorted) {
      const n = (counter.get(r.section.id) ?? 0) + 1;
      counter.set(r.section.id, n);
      next[r.enrollmentId] = String(n);
    }
    setRolls(next);
    setServerErrors(new Set());
  };

  const clearAll = () => setRolls(Object.fromEntries(rows.map((r) => [r.enrollmentId, ""])));
  const reset = () => {
    setRolls(Object.fromEntries(saved));
    setServerErrors(new Set());
  };

  const submit = () => {
    if (blocked) {
      toast.error(t("fixFirst"));
      return;
    }
    const items = changed.map((r) => ({ enrollmentId: r.enrollmentId, rollNumber: (rolls[r.enrollmentId] ?? "").trim() || null }));
    save.mutate(
      {
        academicYearId: sheet.academicYear.id,
        classId: sheet.class.id,
        ...(sheet.section ? { sectionId: sheet.section.id } : {}),
        items,
      },
      {
        onSuccess: (r) => toast.success(t("saved", { count: r.updated })),
        onError: (error) => {
          // the row the server says is used twice
          const fields = getFieldErrors(error);
          const ids = Object.keys(fields).flatMap((path) => {
            const index = Number(/^items\.(\d+)\./.exec(path)?.[1]);
            return Number.isInteger(index) && items[index] ? [items[index].enrollmentId] : [];
          });
          setServerErrors(new Set(ids));
          toast.error(describeError(error));
        },
      },
    );
  };

  /* Enter goes to the next roll box, as on paper. */
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    document.querySelector<HTMLInputElement>(`[data-roll-index="${index + (e.shiftKey ? -1 : 1)}"]`)?.focus();
  };

  if (rows.length === 0) {
    return <Empty text={t("noStudents", { year: sheet.academicYear.name })} />;
  }

  const sectionLabel = (r: RollRow) => (r.section.isDefault ? "—" : r.section.name);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          {t("summary", { students: rows.length, missing, year: sheet.academicYear.name })}
        </p>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Wand2 /> {t("autoNumber")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => numberAll("name")}>{t("orders.name")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => numberAll("admissionNo")}>{t("orders.admissionNo")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => numberAll("current")}>{t("orders.current")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={clearAll}>
                {t("clearAll")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-32">{t("columns.admissionNo")}</TableHead>
              <TableHead>{t("columns.student")}</TableHead>
              {showSections && <TableHead>{t("columns.section")}</TableHead>}
              {hasGroups && <TableHead>{t("columns.group")}</TableHead>}
              <TableHead className="w-36">{t("columns.roll")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const value = rolls[r.enrollmentId] ?? "";
              const isChanged = value !== (saved.get(r.enrollmentId) ?? "");
              const error = problems.bad.has(r.enrollmentId)
                ? t("badRoll")
                : problems.twice.has(r.enrollmentId) || serverErrors.has(r.enrollmentId)
                  ? t("usedTwice")
                  : null;
              return (
                <TableRow key={r.enrollmentId} className={cn(isChanged && "bg-amber-500/5")}>
                  <TableCell className="text-muted-foreground tabular-nums">{format.number(i + 1)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.student.admissionNo}</TableCell>
                  <TableCell className="font-medium">{name(r.student)}</TableCell>
                  {showSections && <TableCell>{sectionLabel(r)}</TableCell>}
                  {hasGroups && <TableCell className="text-muted-foreground">{r.group ? name(r.group) : "—"}</TableCell>}
                  <TableCell>
                    {canEdit ? (
                      <div className="space-y-1">
                        <Input
                          value={value}
                          onChange={(e) => setRoll(r.enrollmentId, e.target.value)}
                          onKeyDown={(e) => onKey(e, i)}
                          data-roll-index={i}
                          inputMode="numeric"
                          maxLength={10}
                          aria-label={t("rollFor", { name: name(r.student) })}
                          aria-invalid={!!error}
                          className="h-8 w-24 tabular-nums"
                        />
                        {error && <p className="text-xs text-destructive">{error}</p>}
                      </div>
                    ) : (
                      <span className="tabular-nums">{value || "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        // the actions stay at the bottom of the sheet
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-b-lg border-t bg-card px-4 py-3">
          <span className="mr-auto text-sm text-muted-foreground">
            {changed.length > 0 ? t("unsaved", { count: changed.length }) : t("noChanges")}
          </span>
          <Button variant="outline" onClick={reset} disabled={changed.length === 0 || save.isPending}>
            <RotateCcw /> {t("reset")}
          </Button>
          <Button onClick={submit} disabled={changed.length === 0 || save.isPending}>
            {save.isPending ? <ListOrdered className="animate-pulse" /> : <Save />}
            {save.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </>
  );
}
