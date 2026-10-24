"use client";

import { Download, Eye, MoreHorizontal, Pencil, Plus, Search, Users, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import { useGroups } from "@/lib/school/groups";
import { downloadCsv } from "@/lib/csv";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
          {data && (
            <span className="rounded-full bg-navy-soft px-2 py-0.5 text-xs font-semibold text-navy tabular-nums">
              {format.number(data.meta.total)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton query={{ search: search || undefined, ...filters }} />
          {can("student:create") && (
            <Button asChild className="h-9 px-4 shadow-sm">
              <Link href="/students/new">
                <Plus /> {t("add")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <section className="overflow-hidden border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <Tabs
          value={filters.status ?? ALL}
          onValueChange={(v) => setFilter({ status: v === ALL ? undefined : (v as StudentStatus) })}
        >
          <TabsList className="px-4 pt-3" aria-label={t("columns.status")}>
            {STATUS_TABS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {tStatus(s)}
                {data?.statusCounts && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                    {format.number(data.statusCounts[s])}
                  </span>
                )}
              </TabsTrigger>
            ))}
            <TabsTrigger value={ALL}>{t("filters.all")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative w-full min-w-0 sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={tCommon("search")}
              className="h-9 bg-muted/40 pl-9 shadow-none"
            />
          </div>
          {fields.map((field) => (
            <FilterSelect key={field.key} field={field} />
          ))}
          {canClear && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
              <X /> {t("filters.clear")}
            </Button>
          )}
        </div>

        <div className={cn("border-t transition-opacity", isFetching && !isPending && "opacity-60")}>
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

/** A compact dropdown in the filter row; its "all" choice (if any) clears it, and it is tinted while set. */
function FilterSelect({ field }: { field: FilterField }) {
  const { label, value, allLabel, options, onChange } = field;
  const active = !!allLabel && value !== undefined;
  return (
    <Select value={value ?? (allLabel ? ALL : "")} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 max-w-44 min-w-0 flex-1 bg-card shadow-none sm:flex-none",
          active && "border-navy/30 bg-navy-soft text-navy [&_svg:not([class*='text-'])]:text-navy",
        )}
      >
        <SelectValue placeholder={label} />
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

/** Saves the students under the current filters and tab as a CSV file. */
function ExportButton({ query }: { query: StudentFilterQuery }) {
  const t = useTranslations("school.students");
  const tStatus = useTranslations("studentStatuses");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const students = await listAllStudents(query);
      downloadCsv(`students-${new Date().toISOString().slice(0, 10)}.csv`, [
        [
          t("form.admissionNo"),
          t("form.nameEn"),
          t("form.nameBn"),
          t("form.class"),
          t("form.section"),
          t("form.group"),
          t("form.rollNumber"),
          t("form.fatherName"),
          t("columns.family"),
          t("columns.status"),
        ],
        ...students.map((s) => {
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
            s.phone ? localPhone(s.phone) : "",
            tStatus(s.status),
          ];
        }),
      ]);
    } catch (error) {
      toast.error(t("exportFailed"), { description: describeError(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={run} disabled={busy} className="h-9 px-4 shadow-sm">
      <Download /> {busy ? t("exporting") : t("export")}
    </Button>
  );
}
