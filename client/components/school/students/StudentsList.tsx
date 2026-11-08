"use client";

import { Ban, Check, Eye, GraduationCap, MoreHorizontal, Pencil, Plus, Search, UserCheck, UserMinus, Users, X, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { TablePagination } from "@/components/data/TablePagination";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import { useGroups } from "@/lib/school/groups";
import { ExportMenu } from "@/components/data/ExportMenu";
import { useSchoolMe } from "@/lib/auth/hooks";
import { datedFileName, type ListExport } from "@/lib/export/listExport";
import {
  listAllStudents,
  localPhone,
  RELIGIONS,
  useStudents,
  type StudentFilterQuery,
  type StudentListItem,
  type AdmissionType,
  type Religion,
  type StudentStatus,
} from "@/lib/school/students";
import type { Gender } from "@/lib/school/teachers";
import { cn } from "@/lib/utils";
import { StudentAvatar } from "./StudentAvatar";
import { StudentStatusBadge } from "./StudentStatusBadge";

const ALL = "ALL";
const PAGE_SIZES = [20, 50, 100];
const COLUMNS = ["photo", "student", "class", "roll", "father", "family", "status"] as const;
const GENDERS = ["MALE", "FEMALE", "OTHER"] as const satisfies readonly Gender[];
// the status tabs above the table, most used first
const STATUS_TABS = ["ACTIVE", "SUSPENDED", "INACTIVE", "GRADUATED"] as const satisfies readonly StudentStatus[];

// undefined = no filter, except the year: undefined there means the current year
type Filters = {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  groupId?: string;
  // new or old students that year (who pays the admission or the re-admission fee)
  admissionType?: AdmissionType;
  gender?: Gender;
  religion?: Religion;
  status?: StudentStatus;
};

const DEFAULT_FILTERS: Filters = { status: "ACTIVE" };

const isChanged = (filters: Filters) =>
  (Object.keys(filters) as (keyof Filters)[]).some((key) => filters[key] !== DEFAULT_FILTERS[key]);

type Option = { value: string; label: string };

/* One dropdown in the filter row. */
type FilterField = {
  key: Exclude<keyof Filters, "status">;
  label: string;
  // its "all" choice; without one (the year) it always has a value
  allLabel?: string;
  options: Option[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

export function StudentsList() {
  const t = useTranslations("school.students");
  const tStatus = useTranslations("studentStatuses");
  const tCommon = useTranslations("common");
  const tType = useTranslations("school.students.admissionType");
  const tGender = useTranslations("genders");
  const tReligion = useTranslations("religions");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const can = useCan();
  const name = useLocalizedName();
  const classes = useClasses();
  const years = useAcademicYears();
  const groups = useGroups();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);

  // one request: this page of students and, for the status tabs, how many each status has
  const { data, isPending, isError, error, isFetching, refetch } = useStudents({
    page,
    limit,
    search: search || undefined,
    ...filters,
    withStatusCounts: true,
  });

  const currentYear = years.data?.find((y) => y.isCurrent);
  const sections =
    classes.data?.items.find((c) => c.id === filters.classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const students = data?.items ?? [];
  const filtering = !!search || Object.values(filters).some(Boolean);
  const canClear = !!searchInput || isChanged(filters);

  // every filter change starts again from page 1
  const setFilter = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  // a dropdown shows only when it has something to choose from
  const fields: FilterField[] = [
    ...(years.data?.length
      ? [
          {
            key: "academicYearId" as const,
            label: t("filters.academicYear"),
            options: years.data.map((y) => ({
              value: y.id,
              label: y.isCurrent ? t("filters.currentYear", { year: y.name }) : y.name,
            })),
            value: filters.academicYearId ?? currentYear?.id,
            // the current year is the default, so picking it clears the filter
            onChange: (id: string | undefined) => setFilter({ academicYearId: id === currentYear?.id ? undefined : id }),
          },
        ]
      : []),
    {
      key: "classId",
      label: t("columns.class"),
      allLabel: t("allClasses"),
      options: classes.data?.items.map((c) => ({ value: c.id, label: c.name })) ?? [],
      value: filters.classId,
      onChange: (classId) => setFilter({ classId, sectionId: undefined }),
    },
    ...(sections.length > 0
      ? [
          {
            key: "sectionId" as const,
            label: t("section"),
            allLabel: t("allSections"),
            options: sections.map((s) => ({ value: s.id, label: s.name })),
            value: filters.sectionId,
            onChange: (sectionId: string | undefined) => setFilter({ sectionId }),
          },
        ]
      : []),
    ...(groups.data?.items.length
      ? [
          {
            key: "groupId" as const,
            label: t("filters.group"),
            allLabel: t("filters.allGroups"),
            options: groups.data.items.map((g) => ({ value: g.id, label: name(g) })),
            value: filters.groupId,
            onChange: (groupId: string | undefined) => setFilter({ groupId }),
          },
        ]
      : []),
    {
      key: "admissionType",
      label: tType("label"),
      allLabel: tType("allTypes"),
      options: (["NEW", "OLD"] as const).map((type) => ({ value: type, label: tType(`types.${type}`) })),
      value: filters.admissionType,
      onChange: (v) => setFilter({ admissionType: v as AdmissionType | undefined }),
    },
    {
      key: "gender",
      label: t("filters.gender"),
      allLabel: t("filters.allGenders"),
      options: GENDERS.map((g) => ({ value: g, label: tGender(g) })),
      value: filters.gender,
      onChange: (v) => setFilter({ gender: v as Gender | undefined }),
    },
    {
      key: "religion",
      label: t("filters.religion"),
      allLabel: t("filters.allReligions"),
      options: RELIGIONS.map((r) => ({ value: r, label: tReligion(r) })),
      value: filters.religion,
      onChange: (v) => setFilter({ religion: v as Religion | undefined }),
    },
  ];


  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-2.5">
          <h1 className="page-title">{t("title")}</h1>
          {data && (
            <span className="mb-1 rounded-full bg-navy-soft px-2 py-0.5 text-xs font-semibold text-navy tabular-nums animate-in fade-in-0 zoom-in-90 duration-300">
              {format.number(data.meta.total)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton query={{ search: search || undefined, ...filters }} filtered={filtering} />
          {can("student:create") && (
            <Button asChild className="h-9 px-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md">
              <Link href="/students/new">
                <Plus /> {t("add")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* the statuses as cards, like the dashboard's: each one picks its students (All clears it) */}
      <div role="group" aria-label={t("columns.status")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {([ALL, ...STATUS_TABS] as const).map((s) => {
          const counts = data?.statusCounts;
          const all = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
          const count = counts ? (s === ALL ? all : counts[s]) : undefined;
          return (
            <StatusCard
              key={s}
              status={s}
              label={s === ALL ? t("filters.all") : tStatus(s)}
              count={count === undefined ? undefined : format.number(count)}
              share={count === undefined || all === 0 ? 0 : (count / all) * 100}
              percent={count === undefined || all === 0 ? "" : format.number(count / all, { style: "percent" })}
              selected={(filters.status ?? ALL) === s}
              onSelect={() => setFilter({ status: s === ALL ? undefined : s })}
            />
          );
        })}
      </div>

      <section className="overflow-hidden border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        {/* one toolbar: the search, then the filters (each names itself inside its box), then "clear" */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 bg-muted/25 px-5 py-3">
          <div className="group/search relative w-full min-w-0 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-navy" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={tCommon("search")}
              className="h-9 rounded-lg bg-card pr-8 pl-9 shadow-none transition-[border-color,box-shadow] duration-200"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setPage(1);
                }}
                aria-label={t("filters.remove", { name: tCommon("search") })}
                className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground animate-in fade-in-0 zoom-in-75 duration-150"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />

          {fields.map((field) => (
            <FilterSelect key={field.key} field={field} />
          ))}

          {canClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 rounded-lg text-muted-foreground transition-colors hover:text-destructive animate-in fade-in-0 slide-in-from-left-1 duration-200"
            >
              <X /> {t("filters.clear")}
            </Button>
          )}
        </div>

        <div className={cn("border-t transition-opacity duration-300", isFetching && !isPending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column} className={cn(HEAD, column === "photo" && "w-16", column === "roll" && "w-20")}>
                    {t(`columns.${column}`)}
                  </TableHead>
                ))}
                <TableHead className={cn(HEAD, "w-12")}>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
              ) : isError ? (
                <MessageRow>
                  <p className="font-medium text-foreground">{t("loadFailed")}</p>
                  <p className="text-xs">{describeError(error)}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    {tCommon("tryAgain")}
                  </Button>
                </MessageRow>
              ) : students.length === 0 ? (
                <MessageRow>
                  <span className="mb-2 flex size-16 items-center justify-center rounded-2xl border border-navy/10 bg-navy-soft text-navy">
                    <Users className="size-6" />
                  </span>
                  <p className="font-medium text-foreground">{filtering ? t("emptyFiltered") : t("empty")}</p>
                  {filtering && canClear && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      {t("filters.clear")}
                    </Button>
                  )}
                </MessageRow>
              ) : (
                students.map((student) => (
                  <StudentRow key={student.id} student={student} canUpdate={can("student:update")} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.meta.total > 0 && (
          <div className="border-t px-5 py-3">
            <TablePagination
              page={data.meta.page}
              limit={data.meta.limit}
              total={data.meta.total}
              totalPages={Math.max(1, data.meta.totalPages)}
              limits={PAGE_SIZES}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
              disabled={isFetching}
            />
          </div>
        )}
      </section>
    </div>
  );
}

// roomier rows; the first and last cells line up with the card's padding
const HEAD = "first:pl-5 last:pr-5";
const CELL = "py-3 first:pl-5 last:pr-5";

// each status card's icon and colours: its icon box, its bar, and its outline when picked
const STATUS_LOOK: Record<typeof ALL | (typeof STATUS_TABS)[number], { icon: LucideIcon; tint: string; bar: string; ring: string }> = {
  ALL: { icon: Users, tint: "bg-brand-soft text-brand", bar: "bg-brand", ring: "border-brand/50 ring-brand/30" },
  ACTIVE: {
    icon: UserCheck,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    ring: "border-emerald-500/50 ring-emerald-500/30",
  },
  SUSPENDED: {
    icon: Ban,
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    ring: "border-amber-500/50 ring-amber-500/30",
  },
  INACTIVE: {
    icon: UserMinus,
    tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    ring: "border-rose-500/50 ring-rose-500/30",
  },
  GRADUATED: {
    icon: GraduationCap,
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    ring: "border-violet-500/50 ring-violet-500/30",
  },
};

/** A status as a dashboard-style card: icon and name, the number, and a bar of its share of all the students. */
function StatusCard({
  status,
  label,
  count,
  share,
  percent,
  selected,
  onSelect,
}: {
  status: keyof typeof STATUS_LOOK;
  label: string;
  // undefined while loading
  count: string | undefined;
  share: number;
  percent: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { icon: Icon, tint, bar, ring } = STATUS_LOOK[status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex flex-col rounded-xl border border-border/70 bg-card px-3.5 py-3 text-left transition-all duration-200 outline-none hover:-translate-y-0.5 hover:border-border hover:shadow-[0_14px_34px_-18px_rgb(15_23_42/0.35)] focus-visible:ring-2 focus-visible:ring-ring/20",
        selected && cn("ring-1 shadow-[0_10px_28px_-18px_rgb(15_23_42/0.35)]", ring),
      )}
    >
      {/* one line: icon and name on the left, the number on the right */}
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5 text-[15px] font-medium text-muted-foreground">
          <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-lg", tint)}>
            <Icon className="size-4" />
            {/* a tick on the picked card's icon */}
            <span
              aria-hidden
              className={cn(
                "absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full text-white ring-2 ring-card transition-all duration-200",
                bar,
                selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
            >
              <Check className="size-2.5" strokeWidth={3.5} />
            </span>
          </span>
          <span className={cn("truncate transition-colors", selected && "text-foreground")}>{label}</span>
        </span>
        {count === undefined ? (
          <Skeleton className="h-6 w-8" />
        ) : (
          <span className="shrink-0 text-2xl leading-none font-semibold tracking-tight tabular-nums">{count}</span>
        )}
      </span>
      <span aria-hidden className="mt-2.5 flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", bar)} style={{ width: `${share}%` }} />
        </span>
        <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{percent}</span>
      </span>
    </button>
  );
}

/** A compact dropdown in the toolbar, "Class: All": its name inside the box, its "all" choice (if any) clears it, and it is tinted while set. */
function FilterSelect({ field }: { field: FilterField }) {
  const { label, value, allLabel, options, onChange } = field;
  const active = !!allLabel && value !== undefined;
  return (
    <Select value={value ?? (allLabel ? ALL : "")} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 max-w-72 gap-1.5 rounded-lg bg-card pr-2.5 pl-3 shadow-none transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-foreground/25 dark:bg-card",
          active && "border-navy/30 bg-navy-soft text-navy hover:border-navy/50 dark:bg-navy-soft [&_svg:not([class*='text-'])]:text-navy",
        )}
      >
        <span className={cn("shrink-0 text-muted-foreground", active && "text-navy/70")}>{label}:</span>
        <span className="min-w-0 truncate font-medium">
          <SelectValue placeholder={allLabel} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SkeletonRow() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className={CELL}>
        <Skeleton className="size-10 rounded-full" />
      </TableCell>
      <TableCell className={CELL}>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
      </TableCell>
      {Array.from({ length: COLUMNS.length - 1 }, (_, j) => (
        <TableCell key={j} className={CELL}>
          <Skeleton className="h-3.5 w-full max-w-28" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-56">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function StudentRow({ student, canUpdate }: { student: StudentListItem; canUpdate: boolean }) {
  const t = useTranslations("school.students");
  const name = useLocalizedName();
  const href = `/students/${student.id}`;
  const enrollment = student.enrollment;
  // under the class: section and group (the roll has its own column)
  const details = enrollment
    ? [
        !enrollment.section.isDefault && enrollment.section.name,
        enrollment.group && name(enrollment.group),
        enrollment.status !== "ACTIVE" && enrollment.academicYear.name,
      ].filter(Boolean)
    : [];

  return (
    <TableRow className="group/row">
      <TableCell className={CELL}>
        <Link href={href} tabIndex={-1} aria-hidden>
          <StudentAvatar photo={student.photo} name={name(student)} className="size-10" />
        </Link>
      </TableCell>
      <TableCell className={CELL}>
        <Link href={href} className="font-medium hover:text-navy hover:underline">
          {name(student)}
        </Link>
        <div className="text-xs text-muted-foreground tabular-nums">{t("admissionNoShort", { no: student.admissionNo })}</div>
      </TableCell>
      <TableCell className={CELL}>
        {enrollment ? (
          <>
            <div className="font-medium">{enrollment.class.name}</div>
            {details.length > 0 && <div className="text-xs text-muted-foreground">{details.join(" · ")}</div>}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className={cn(CELL, "font-medium tabular-nums")}>
        {enrollment?.rollNumber ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className={CELL}>{student.fatherName}</TableCell>
      <TableCell className={cn(CELL, "tabular-nums")}>
        {student.phone ? localPhone(student.phone) : <span className="text-muted-foreground/70">{t("noLogin")}</span>}
      </TableCell>
      <TableCell className={CELL}>
        <StudentStatusBadge status={student.status} />
      </TableCell>
      <TableCell className={CELL}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground group-hover/row:text-foreground"
              aria-label={t("columns.actions")}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={href}>
                <Eye /> {t("view")}
              </Link>
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem asChild>
                <Link href={`${href}/edit`}>
                  <Pencil /> {t("edit")}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/** Saves (Excel) or prints (PDF) the students under the current filters and tab. */
function ExportButton({ query, filtered }: { query: StudentFilterQuery; filtered: boolean }) {
  const t = useTranslations("school.students");
  const tStatus = useTranslations("studentStatuses");
  const tGender = useTranslations("genders");
  const tExport = useTranslations("export");
  const name = useLocalizedName();
  const format = useFormatter();
  const me = useSchoolMe();

  const load = async (): Promise<ListExport> => {
    const students = await listAllStudents(query);
    return {
      fileName: datedFileName("students"),
      school: me ? name(me.school) : "",
      title: t("title"),
      subtitle: [
        tExport("made", { date: format.dateTime(new Date(), { dateStyle: "medium", timeZone: "Asia/Dhaka" }) }),
        tExport("count", { count: students.length }),
        filtered ? tExport("filtered") : null,
      ]
        .filter(Boolean)
        .join(" · "),
      columns: [
        { header: t("form.admissionNo") },
        { header: t("form.nameEn") },
        { header: t("form.nameBn") },
        { header: t("form.class") },
        { header: t("form.section") },
        { header: t("form.group") },
        { header: t("form.rollNumber"), align: "right" },
        { header: t("form.fatherName") },
        { header: t("form.gender") },
        { header: t("columns.family") },
        { header: t("columns.status") },
      ],
      rows: students.map((s) => {
        const e = s.enrollment;
        return [
          s.admissionNo,
          s.nameEn,
          s.nameBn,
          e?.class.name,
          e && !e.section.isDefault ? e.section.name : "",
          e?.group ? name(e.group) : "",
          e?.rollNumber,
          s.fatherName,
          s.gender ? tGender(s.gender) : "",
          s.phone ? localPhone(s.phone) : "",
          tStatus(s.status),
        ];
      }),
    };
  };

  return <ExportMenu load={load} />;
}
