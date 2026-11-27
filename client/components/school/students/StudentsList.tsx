"use client";

import { Ban, Eye, GraduationCap, MoreHorizontal, Pencil, Plus, Search, UserCheck, UserMinus, Users, X, type LucideIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { TablePagination } from "@/components/data/TablePagination";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { currentYearOf, useAcademicYears } from "@/lib/school/academicYears";
import { useInstitutionTracks } from "@/lib/school/tracks";
import { useYearLabel } from "@/components/school/years/TrackSwitch";
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
  type StudentSort,
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
// rows per page: enough for most of a class; with a class picked, the most the server allows (a section)
const DEFAULT_LIMIT = 50;
const CLASS_LIMIT = 100;
// with one class picked its name is in the toolbar; with all classes it gets its own column
const CLASS_COLUMNS = ["roll", "student", "father", "phone", "status"] as const;
const ALL_CLASSES_COLUMNS = ["roll", "class", "student", "father", "phone", "status"] as const;
type Column = (typeof ALL_CLASSES_COLUMNS)[number];
const GENDERS = ["MALE", "FEMALE", "OTHER"] as const satisfies readonly Gender[];
// the status cards above the list, most used first
const STATUS_TABS = ["ACTIVE", "SUSPENDED", "INACTIVE", "GRADUATED"] as const satisfies readonly StudentStatus[];
// the list's order besides the usual one (roll for a class, else admission no.): by when the student was added
const SORTS = ["newest", "oldest"] as const;
type Sort = (typeof SORTS)[number];
const SORT_QUERY: Record<Sort, StudentSort> = {
  newest: { sortBy: "createdAt", sortOrder: "desc" },
  oldest: { sortBy: "createdAt", sortOrder: "asc" },
};
const DEFAULT_SORT = "default";

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

const isChanged = (filters: Filters) => (Object.keys(filters) as (keyof Filters)[]).some((key) => filters[key] !== DEFAULT_FILTERS[key]);

// each filter's name in the address ("?class=…&section=…&status=all&sort=newest&page=2")
const PARAMS: Record<keyof Filters, string> = {
  academicYearId: "year",
  classId: "class",
  sectionId: "section",
  groupId: "group",
  admissionType: "type",
  gender: "gender",
  religion: "religion",
  status: "status",
};
// the status in the address: none means the default (Active), "all" means no status filter
const ALL_STATUSES = "all";

/*
 * The list's place (filters, search, order, page, rows per page) lives in the address, so Back
 * from a student, a refresh or a shared link returns to the same class, status and page. Unknown
 * values in the address are ignored.
 */
function useRegisterPlace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const text = (key: string) => params.get(key)?.trim() || undefined;
  const pick = <T extends string>(key: string, allowed: readonly T[]) => {
    const value = params.get(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
  };

  const statusParam = params.get(PARAMS.status);
  const filters: Filters = {
    academicYearId: text(PARAMS.academicYearId),
    classId: text(PARAMS.classId),
    sectionId: text(PARAMS.sectionId),
    groupId: text(PARAMS.groupId),
    admissionType: pick(PARAMS.admissionType, ["NEW", "OLD"] as const),
    gender: pick(PARAMS.gender, GENDERS),
    religion: pick(PARAMS.religion, RELIGIONS),
    status: statusParam === ALL_STATUSES ? undefined : (pick(PARAMS.status, STATUS_TABS) ?? DEFAULT_FILTERS.status),
  };
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "", 10) || 1);
  const askedLimit = Number(params.get("limit"));
  const limit = PAGE_SIZES.includes(askedLimit) ? askedLimit : undefined;
  const search = params.get("q") ?? "";
  const sort = pick("sort", SORTS);

  // undefined removes the key; the page is written only when it is past the first
  const write = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // a filter change starts again from page 1
  const setFilters = (patch: Partial<Filters>) =>
    write({
      ...Object.fromEntries(
        (Object.keys(patch) as (keyof Filters)[]).map((key) => {
          const value = patch[key];
          if (key === "status") return [PARAMS.status, value === DEFAULT_FILTERS.status ? undefined : (value ?? ALL_STATUSES)];
          return [PARAMS[key], value];
        }),
      ),
      page: undefined,
    });

  return {
    filters,
    page,
    limit,
    search,
    sort,
    setFilters,
    setSearch: (q: string) => write({ q: q || undefined, page: undefined }),
    setSort: (s: Sort | undefined) => write({ sort: s, page: undefined }),
    setPage: (n: number) => write({ page: n > 1 ? String(n) : undefined }),
    setLimit: (n: number) => write({ limit: String(n), page: undefined }),
    clear: () => router.replace(pathname, { scroll: false }),
  };
}

type Option = { value: string; label: string };

/* One dropdown in the toolbar. */
type FilterField = {
  key: string;
  label: string;
  // its "all" choice; without one (the year, the order) it always has a value
  allLabel?: string;
  // the choices, or the choices under headings (the classes: School, College)
  options: Option[];
  groups?: { label: string; options: Option[] }[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  // a filter that is set is outlined; the order is not a filter
  quiet?: boolean;
  // its name shows only beside the "all" choice (screen readers always hear it)
  labelOnlyForAll?: boolean;
};

/**
 * The school's student register: a card per status (with how many each has), then one card
 * holding the toolbar (search, class and section, the other filters, the order) and the table.
 * The roll leads each row, the way the office looks students up.
 */
export function StudentsList() {
  const t = useTranslations("school.students");
  const tStatus = useTranslations("studentStatuses");
  const tCommon = useTranslations("common");
  const tType = useTranslations("school.students.admissionType");
  const tGender = useTranslations("genders");
  const tReligion = useTranslations("religions");
  const format = useFormatter();
  const locale = useLocale();
  const describeError = useErrorMessage();
  const can = useCan();
  const name = useLocalizedName();
  const classes = useClasses();
  const years = useAcademicYears();
  const groups = useGroups();

  const place = useRegisterPlace();
  const { filters, page, search, sort } = place;
  // a class's list fits on one page unless a smaller page was chosen
  const limit = place.limit ?? (filters.classId ? CLASS_LIMIT : DEFAULT_LIMIT);
  // the usual order: a class's list runs in roll order, like the register; otherwise by admission no.
  const order: StudentSort = sort ? SORT_QUERY[sort] : filters.classId ? { sortBy: "roll" } : {};

  // the box shows what is typed at once; the address (and the search) follow after a pause
  const [searchInput, setSearchInput] = useState(search);
  const typed = useDebouncedValue(searchInput.trim());
  useEffect(() => {
    if (typed !== search) place.setSearch(typed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new pause in typing writes the address
  }, [typed]);

  // one request: this page of students and, for the status cards, how many each status has
  const { data, isPending, isPlaceholderData, isError, error, isFetching, refetch } = useStudents({
    page,
    limit,
    search: search || undefined,
    ...filters,
    ...order,
    withStatusCounts: true,
  });

  const { main } = useInstitutionTracks();
  const yearLabel = useYearLabel();
  // the default view: the current year (with school and college, each student in their own track's)
  const currentYear = currentYearOf(years.data, main) ?? currentYearOf(years.data);
  const pickedYear = filters.academicYearId ? years.data?.find((y) => y.id === filters.academicYearId) : undefined;
  const pickedClass = classes.data?.items.find((c) => c.id === filters.classId);
  const sections = pickedClass?.sections.filter((s) => !s.isDefault) ?? [];
  const students = data?.items ?? [];
  // read from the filter, not the loaded class, so the columns don't jump while the classes load
  const columns = filters.classId ? CLASS_COLUMNS : ALL_CLASSES_COLUMNS;
  // the default view (Active, every class) is not a filter
  const filtering = !!search || isChanged(filters);
  const canClear = !!searchInput || isChanged(filters) || !!sort;
  const setFilter = place.setFilters;

  const clearFilters = () => {
    setSearchInput("");
    place.clear();
  };

  // the classes, under School and College headings when the school has both (a picked year:
  // only its own track's classes)
  const yearClasses = (classes.data?.items ?? []).filter((c) => !pickedYear || c.track === pickedYear.track);
  const schoolClasses = yearClasses.filter((c) => c.track === "SCHOOL");
  const collegeClasses = yearClasses.filter((c) => c.track === "COLLEGE");
  const classOption = (c: { id: string; name: string }) => ({ value: c.id, label: c.name });

  // a dropdown shows only when it has something to choose from
  const placeFields: FilterField[] = [
    {
      key: "classId",
      label: t("columns.class"),
      allLabel: t("allClasses"),
      options: yearClasses.map(classOption),
      groups:
        schoolClasses.length > 0 && collegeClasses.length > 0
          ? [
              { label: t("register.school"), options: schoolClasses.map(classOption) },
              { label: t("register.college"), options: collegeClasses.map(classOption) },
            ]
          : undefined,
      value: filters.classId,
      onChange: (classId) => setFilter({ classId, sectionId: undefined }),
      // a picked class names itself ("Class 6"), so "Class" before it would say it twice
      labelOnlyForAll: true,
    },
    ...(sections.length > 0
      ? [
          {
            key: "sectionId",
            label: t("section"),
            allLabel: t("allSections"),
            options: sections.map((s) => ({ value: s.id, label: s.name })),
            value: filters.sectionId,
            onChange: (sectionId: string | undefined) => setFilter({ sectionId }),
          },
        ]
      : []),
  ];

  const otherFields: FilterField[] = [
    ...(years.data?.length
      ? [
          {
            key: "academicYearId",
            label: t("filters.academicYear"),
            options: years.data.map((y) => ({
              value: y.id,
              label: y.isCurrent ? t("filters.currentYear", { year: yearLabel(y) }) : yearLabel(y),
            })),
            value: filters.academicYearId ?? currentYear?.id,
            // the current year is the default, so picking it clears the filter
            // (a class of the other track has no place in the picked year)
            onChange: (id: string | undefined) => {
              const next = years.data?.find((y) => y.id === id);
              const picked = classes.data?.items.find((c) => c.id === filters.classId);
              setFilter({
                academicYearId: id === currentYear?.id ? undefined : id,
                ...(picked && next && picked.track !== next.track ? { classId: undefined, sectionId: undefined } : {}),
              });
            },
          },
        ]
      : []),
    ...(groups.data?.items.length
      ? [
          {
            key: "groupId",
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

  const sortField: FilterField = {
    key: "sort",
    label: t("sort.label"),
    options: [
      // the usual order says what it is
      { value: DEFAULT_SORT, label: filters.classId ? t("sort.roll") : t("sort.admissionNo") },
      ...SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) })),
    ],
    value: sort ?? DEFAULT_SORT,
    onChange: (v) => place.setSort(v === DEFAULT_SORT ? undefined : (v as Sort)),
    quiet: true,
  };

  const counts = data?.statusCounts;
  const allCount = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined;
  const statusWord = filters.status ? tStatus(filters.status) : "";
  const statusInSentence = locale === "en" ? statusWord.toLowerCase() : statusWord;
  // the rows still on screen belong to the last choice while the new ones load
  const loadingNew = isFetching && isPlaceholderData;
  // statuses with students when this one has none ("No active students here; Suspended (1)")
  const otherTabs = counts ? STATUS_TABS.filter((s) => s !== filters.status && counts[s] > 0) : [];

  // the year whose classes the list shows (the current one unless another is picked)
  const shownYear = years.data?.find((y) => y.id === (filters.academicYearId ?? currentYear?.id));

  return (
    // the header panel, the status cards, then one sheet down to the bottom of the window
    // the window less the 72px top bar and the page's 14px gaps above and below
    <div className="flex flex-1 flex-col gap-2 md:min-h-[calc(100svh-6.25rem)]">
      <PageHero
        title={t("title")}
        description={
          shownYear
            ? t("descriptionYear", {
                // no year picked, school and college: both current years
                year: filters.academicYearId
                  ? shownYear.name
                  : (years.data ?? []).filter((y) => y.isCurrent).map((y) => y.name).join(" · ") || shownYear.name,
              })
            : t("description")
        }
        actions={
          <>
            <ExportButton
              query={{ search: search || undefined, ...filters }}
              sort={sort ? SORT_QUERY[sort] : undefined}
              filtered={filtering}
              className="border-white/35 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white max-sm:flex-1 dark:border-white/35 dark:bg-transparent dark:hover:bg-white/10"
            />
            {can("student:create") && (
              <Button asChild className="h-9 bg-white px-4 text-brand-ink hover:bg-white/90 max-sm:flex-1">
                <Link href="/students/new">
                  <Plus /> {t("add")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* the statuses as cards: each picks its students (All clears it), with how many there are
          and their share of all. A row that scrolls sideways below lg, five across from lg */}
      <div
        role="group"
        aria-label={t("columns.status")}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 scrollbar-none lg:grid lg:grid-cols-5 lg:overflow-visible"
      >
        {([ALL, ...STATUS_TABS] as const).map((s) => {
          const count = counts ? (s === ALL ? allCount : counts[s]) : undefined;
          const share = count === undefined || !allCount ? 0 : count / allCount;
          return (
            <StatusCard
              key={s}
              status={s}
              label={s === ALL ? t("filters.all") : tStatus(s)}
              count={count === undefined ? undefined : format.number(count)}
              share={share}
              percent={count === undefined || !allCount ? "" : format.number(share, { style: "percent" })}
              selected={(filters.status ?? ALL) === s}
              onSelect={() => setFilter({ status: s === ALL ? undefined : s })}
            />
          );
        })}
      </div>

      <Card className="flex-1 gap-0 overflow-hidden border-border/60 py-0">
        {/* the toolbar, two rows: the search, the class and its section, and the order at the end;
            under them the other filters and "clear" */}
        <div className="space-y-3 border-b border-border/60 bg-muted/40 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            <div className="group/search relative w-full min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/search:text-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={tCommon("search")}
                className="h-9 border-border/60 bg-card pr-8 pl-9 shadow-none dark:bg-card"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label={t("filters.remove", { name: tCommon("search") })}
                  className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Divider />
            {placeFields.map((field) => (
              <FilterSelect key={field.key} field={field} />
            ))}

            <div className="sm:ml-auto">
              <FilterSelect field={sortField} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            {otherFields.map((field) => (
              <FilterSelect key={field.key} field={field} />
            ))}

            {canClear && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground hover:text-foreground">
                <X /> {t("filters.clear")}
              </Button>
            )}
          </div>
        </div>

        <div aria-busy={loadingNew} className={cn("transition-opacity duration-300", isFetching && !isPending && "opacity-60")}>
          <Table>
            <TableHeader className="bg-navy-soft/70 [&_tr]:border-navy/10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className={cn(HEAD, column === "roll" && "w-24")}>
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
                Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} columns={columns.length} />)
              ) : isError ? (
                <MessageRow columns={columns.length}>
                  <p className="font-medium text-foreground">{t("loadFailed")}</p>
                  <p className="text-xs">{describeError(error)}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    {tCommon("tryAgain")}
                  </Button>
                </MessageRow>
              ) : students.length === 0 ? (
                <MessageRow columns={columns.length}>
                  <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="size-5" />
                  </span>
                  {filters.status && otherTabs.length > 0 ? (
                    // none with this status, but some with others: say where they are
                    <>
                      <p className="font-medium text-foreground">{t("register.noneInTab", { status: statusInSentence })}</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {otherTabs.map((s) => (
                          <Button key={s} variant="outline" size="sm" onClick={() => setFilter({ status: s })}>
                            {t("register.showTab", { status: tStatus(s), count: format.number(counts![s]) })}
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : filtering ? (
                    <>
                      <p className="font-medium text-foreground">{t("emptyFiltered")}</p>
                      {canClear && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          {t("filters.clear")}
                        </Button>
                      )}
                    </>
                  ) : (
                    // a school with no students yet: its first admission starts here
                    <>
                      <p className="font-medium text-foreground">{t("empty")}</p>
                      {can("student:create") && (
                        <Button asChild size="sm">
                          <Link href="/students/new">
                            <Plus /> {t("add")}
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                </MessageRow>
              ) : (
                students.map((student) => <StudentRow key={student.id} student={student} columns={columns} canUpdate={can("student:update")} />)
              )}
            </TableBody>
          </Table>
        </div>

        {/* at the bottom of the sheet, however few rows there are */}
        {data && data.meta.total > 0 && (
          <div className="mt-auto border-t border-border/60 px-5 py-3">
            <TablePagination
              page={data.meta.page}
              limit={data.meta.limit}
              total={data.meta.total}
              totalPages={Math.max(1, data.meta.totalPages)}
              limits={PAGE_SIZES}
              onPageChange={place.setPage}
              onLimitChange={place.setLimit}
              disabled={isFetching}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// roomier rows; the first and last cells line up with the card's padding. The headings read
// as plain words, in sentence case, rather than the tables' usual small capitals
const HEAD = "h-11 tracking-normal text-navy normal-case first:pl-5 last:pr-5";

const CELL = "py-3 first:pl-5 last:pr-5";

/* A hairline between the toolbar's groups, from sm (on a phone the controls wrap) */
function Divider() {
  return <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />;
}

// each status card's icon and colours, the same as its status pill: icon box, share bar
const STATUS_LOOK: Record<typeof ALL | (typeof STATUS_TABS)[number], { icon: LucideIcon; tint: string; bar: string }> = {
  ALL: { icon: Users, tint: "bg-brand-soft text-brand", bar: "bg-brand" },
  ACTIVE: { icon: UserCheck, tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", bar: "bg-emerald-500" },
  SUSPENDED: { icon: Ban, tint: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", bar: "bg-red-500" },
  INACTIVE: { icon: UserMinus, tint: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/60" },
  GRADUATED: { icon: GraduationCap, tint: "bg-navy-soft text-navy", bar: "bg-navy" },
};

/**
 * A status as a card: its icon and name, the number, and a bar of its share of all the students.
 * The picked one carries the gold "you are here" bar along its top and a darker edge; hover only
 * darkens the edge.
 */
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
  // 0 to 1
  share: number;
  percent: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { icon: Icon, tint, bar } = STATUS_LOOK[status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex min-w-40 shrink-0 flex-col overflow-hidden rounded-lg border bg-card px-4 pt-4 pb-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:min-w-0",
        selected ? "border-foreground/25" : "border-border/70 hover:border-foreground/20",
      )}
    >
      {selected && <span aria-hidden className="absolute inset-x-0 top-0 h-0.75 bg-sidebar-primary" />}
      <span className="flex items-center justify-between gap-3">
        <span className={cn("flex min-w-0 items-center gap-2.5 text-[15px] font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", tint)}>
            <Icon className="size-4" />
          </span>
          <span className="truncate">{label}</span>
        </span>
        {count === undefined ? (
          <Skeleton className="h-6 w-8" />
        ) : (
          <span className="shrink-0 text-2xl leading-none font-semibold tracking-tight tabular-nums">{count}</span>
        )}
      </span>
      <span aria-hidden className="mt-3.5 flex items-center gap-2">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <span className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", bar)} style={{ width: `${share * 100}%` }} />
        </span>
        <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{percent}</span>
      </span>
    </button>
  );
}

/** A compact dropdown in the toolbar, "Class 7": its name inside the box, its "all" choice (if any) clears it, and it is outlined while set. */
function FilterSelect({ field }: { field: FilterField }) {
  const { label, value, allLabel, options, groups, onChange, quiet, labelOnlyForAll } = field;
  const active = !quiet && !!allLabel && value !== undefined;
  const item = (option: Option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  );
  return (
    <Select value={value ?? (allLabel ? ALL : "")} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger
        className={cn(
          "h-9 max-w-72 gap-1.5 border-border/60 bg-card pr-2.5 pl-3 shadow-none transition-colors hover:border-foreground/25 dark:bg-card",
          active && "border-foreground/35 bg-muted/60 dark:bg-muted/60",
        )}
      >
        <span className={cn("shrink-0 text-muted-foreground", labelOnlyForAll && value !== undefined && "sr-only")}>{label}</span>
        <span className="min-w-0 truncate font-medium">
          <SelectValue placeholder={allLabel} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {groups
          ? groups.map((group, i) => (
              <Fragment key={group.label}>
                {(i > 0 || allLabel) && <SelectSeparator />}
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map(item)}
                </SelectGroup>
              </Fragment>
            ))
          : options.map(item)}
      </SelectContent>
    </Select>
  );
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      {Array.from({ length: columns + 1 }, (_, j) => (
        <TableCell key={j} className={CELL}>
          <Skeleton className="h-3.5 w-full max-w-28" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function MessageRow({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns + 1} className="h-56">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">{children}</div>
      </TableCell>
    </TableRow>
  );
}

function StudentRow({ student, columns, canUpdate }: { student: StudentListItem; columns: readonly Column[]; canUpdate: boolean }) {
  const t = useTranslations("school.students");
  const name = useLocalizedName();
  const href = `/students/${student.id}`;
  const enrollment = student.enrollment;
  // the section only when the class has more than one; the year only when it is not the current one
  const classDetail = enrollment
    ? [!enrollment.section.isDefault && enrollment.section.name, enrollment.status !== "ACTIVE" && enrollment.academicYear.name].filter(Boolean).join(", ")
    : "";

  const cells: Record<Column, React.ReactNode> = {
    class: (
      <TableCell key="class" className={cn(CELL, "whitespace-nowrap")}>
        {enrollment ? (
          <>
            <div className="font-medium">{enrollment.class.name}</div>
            {classDetail && <div className="text-xs text-muted-foreground">{classDetail}</div>}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    ),
    roll: (
      <TableCell key="roll" className={CELL}>
        <div className="text-lg leading-tight font-bold text-navy tabular-nums">
          {enrollment?.rollNumber ?? <span className="text-base font-normal text-muted-foreground">—</span>}
        </div>
      </TableCell>
    ),
    student: (
      <TableCell key="student" className={CELL}>
        <div className="flex items-center gap-3">
          <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
            <StudentAvatar photo={student.photo} name={name(student)} className="size-9" />
          </Link>
          <div className="min-w-0">
            <Link href={href} className="font-semibold underline-offset-4 hover:underline">
              {name(student)}
            </Link>
            <div className="text-xs text-muted-foreground tabular-nums">{t("admissionNoShort", { no: student.admissionNo })}</div>
          </div>
        </div>
      </TableCell>
    ),
    father: (
      <TableCell key="father" className={CELL}>
        {student.fatherName}
      </TableCell>
    ),
    phone: (
      <TableCell key="phone" className={cn(CELL, "tabular-nums")}>
        {student.phone ? localPhone(student.phone) : <span className="text-muted-foreground">{t("noLogin")}</span>}
      </TableCell>
    ),
    status: (
      <TableCell key="status" className={CELL}>
        <StudentStatusBadge status={student.status} />
      </TableCell>
    ),
  };

  return (
    <TableRow className="group/row">
      {columns.map((column) => cells[column])}
      <TableCell className={CELL}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground group-hover/row:text-foreground"
              aria-label={t("actionsFor", { name: name(student) })}
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

/** Saves (Excel) or prints (PDF) the students under the current filters and status, in the list's order. */
function ExportButton({
  query,
  sort,
  filtered,
  className,
}: {
  query: StudentFilterQuery;
  sort: StudentSort | undefined;
  filtered: boolean;
  className?: string;
}) {
  const t = useTranslations("school.students");
  const tStatus = useTranslations("studentStatuses");
  const tGender = useTranslations("genders");
  const tExport = useTranslations("export");
  const name = useLocalizedName();
  const format = useFormatter();
  const me = useSchoolMe();

  const load = async (): Promise<ListExport> => {
    const students = await listAllStudents(query, sort);
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
        { header: t("columns.phone") },
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

  return <ExportMenu load={load} className={className} />;
}
