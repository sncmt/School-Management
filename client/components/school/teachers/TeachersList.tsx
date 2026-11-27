"use client";

import { Eye, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { TablePagination } from "@/components/data/TablePagination";
import { PageHero } from "@/components/layout/PageHero";
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
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useLocalizedName } from "@/lib/i18n/names";
import { ExportMenu } from "@/components/data/ExportMenu";
import { useSchoolMe } from "@/lib/auth/hooks";
import { datedFileName, type ListExport } from "@/lib/export/listExport";
import {
  listAllTeachers,
  TEACHER_SORTS,
  TEACHER_STATUSES,
  useTeachers,
  type Teacher,
  type TeacherSort,
  type TeacherStatus,
} from "@/lib/school/teachers";
import { cn } from "@/lib/utils";
import { TeacherCredentialsDialog, type TeacherCredentials } from "./TeacherCredentialsDialog";
import { TeacherFormDialog } from "./TeacherFormDialog";
import { TeacherStatusBadge } from "./TeacherStatusBadge";
// a person's photo as a small circle, else their initials: the same in every list
import { StudentAvatar } from "../students/StudentAvatar";

const ALL = "ALL";
const PAGE_SIZES = [20, 50, 100];
const COLUMNS = ["name", "phone", "joined", "status"] as const;

export function TeachersList() {
  const t = useTranslations("school.teachers");
  const tStatus = useTranslations("teacherStatuses");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [status, setStatus] = useState<TeacherStatus | undefined>();
  // the teachers added first come first, unless another order is picked
  const [sort, setSort] = useState<TeacherSort>("oldest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);

  const { data, isPending, isError, error, isFetching, refetch } = useTeachers({
    page,
    limit,
    search: search || undefined,
    status,
    sort,
  });

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [credentials, setCredentials] = useState<TeacherCredentials | null>(null);

  const teachers = data?.items ?? [];
  const filtering = !!search || !!status;

  return (
    // the header panel, then one sheet (toolbar, table, pages) down to the bottom of the window
    <div className="flex flex-1 flex-col gap-2 md:min-h-[calc(100svh-6.25rem)]">
      <PageHero
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <TeachersExport
              query={{ search: search || undefined, status, sort }}
              filtered={filtering}
              className="border-white/35 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white max-sm:flex-1 dark:border-white/35 dark:bg-transparent dark:hover:bg-white/10"
            />
            {can("teacher:create") && (
              <Button onClick={() => setAdding(true)} className="h-9 bg-white px-4 text-brand-ink hover:bg-white/90 max-sm:flex-1">
                <Plus /> {t("add")}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
      {/* the toolbar: the search, then the status and the order */}
      <div className="flex flex-wrap items-end gap-2 border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-5">
        <Select
          value={status ?? ALL}
          onValueChange={(v) => {
            setStatus(v === ALL ? undefined : (v as TeacherStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" label={t("columns.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {TEACHER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v as TeacherSort);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" label={t("sort.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEACHER_SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`sort.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative order-first w-full sm:mr-auto sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            aria-label={tCommon("search")}
            className="bg-card pl-8 dark:bg-card"
          />
        </div>
      </div>

      <div className={cn("transition-opacity", isFetching && !isPending && "opacity-60")}>
        {/* the first and last cells line up with the toolbar's padding */}
        <Table className="[&_td:first-child]:pl-5 [&_td:last-child]:pr-5">
          <TableHeader className="bg-navy-soft/70 [&_tr]:border-navy/10">
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column} className={HEAD}>
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
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <MessageRow>
                <p>{t("loadFailed")}</p>
                <p className="text-xs">{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : teachers.length === 0 ? (
              <MessageRow>
                <p>{filtering ? t("emptyFiltered") : t("empty")}</p>
              </MessageRow>
            ) : (
              teachers.map((teacher) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                  canUpdate={can("teacher:update")}
                  onEdit={() => setEditing(teacher)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* at the bottom of the sheet, however few rows there are */}
      {data && data.meta.total > 0 && (
        <div className="mt-auto border-t border-border/60 px-4 py-3 sm:px-5">
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
      </div>

      <TeacherFormDialog
        open={adding || !!editing}
        teacher={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onCredentials={setCredentials}
      />
      <TeacherCredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

// headings as plain words in the accent, like the Students register
const HEAD = "h-11 tracking-normal text-navy normal-case first:pl-5 last:pr-5";

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function TeacherRow({ teacher, canUpdate, onEdit }: { teacher: Teacher; canUpdate: boolean; onEdit: () => void }) {
  const t = useTranslations("school.teachers");
  const format = useFormatter();
  const name = useLocalizedName();
  const user = teacher.membership.user;
  const working = teacher.status === "ACTIVE" || teacher.status === "ON_LEAVE";

  return (
    <TableRow>
      <TableCell>
        {/* the photo (or initials) beside the name and designation; both open the teacher */}
        <div className="flex items-center gap-3">
          <Link href={`/teachers/${teacher.id}`} tabIndex={-1} aria-hidden className="shrink-0">
            <StudentAvatar photo={teacher.photo} name={name(teacher)} className="size-9" />
          </Link>
          <div className="min-w-0">
            <Link href={`/teachers/${teacher.id}`} className="font-medium hover:underline">
              {name(teacher)}
            </Link>
            {teacher.designation && <div className="text-xs text-muted-foreground">{teacher.designation}</div>}
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div>{user.phone?.replace(/^\+?880/, "0")}</div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {teacher.joiningDate ? format.dateTime(new Date(teacher.joiningDate), { dateStyle: "medium", timeZone: "UTC" }) : "—"}
      </TableCell>
      <TableCell>
        <TeacherStatusBadge status={teacher.status} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/teachers/${teacher.id}`}>
                <Eye /> {t("view")}
              </Link>
            </DropdownMenuItem>
            {canUpdate && working && (
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> {t("edit")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/** Saves (Excel) or prints (PDF) the teachers under the current filters, in the list's order. */
function TeachersExport({
  query,
  filtered,
  className,
}: {
  query: { search?: string; status?: TeacherStatus; sort?: TeacherSort };
  filtered: boolean;
  className?: string;
}) {
  const t = useTranslations("school.teachers");
  const tStatus = useTranslations("teacherStatuses");
  const tGender = useTranslations("genders");
  const tExport = useTranslations("export");
  const name = useLocalizedName();
  const format = useFormatter();
  const me = useSchoolMe();
  const day = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" }) : "");
  const phone = (p: string | null) => (p ?? "").replace(/^\+?880/, "0");

  const load = async (): Promise<ListExport> => {
    const teachers = await listAllTeachers(query);
    return {
      fileName: datedFileName("teachers"),
      school: me ? name(me.school) : "",
      title: t("title"),
      subtitle: [
        tExport("made", { date: format.dateTime(new Date(), { dateStyle: "medium", timeZone: "Asia/Dhaka" }) }),
        tExport("count", { count: teachers.length }),
        filtered ? tExport("filtered") : null,
      ]
        .filter(Boolean)
        .join(" · "),
      columns: [
        { header: t("form.nameEn") },
        { header: t("form.nameBn") },
        { header: t("form.designation") },
        { header: t("form.phone") },
        { header: t("form.joiningDate") },
        { header: t("form.qualification") },
        { header: t("form.mpoIndex") },
        { header: t("form.gender") },
        { header: t("columns.status") },
      ],
      rows: teachers.map((teacher) => [
        teacher.nameEn,
        teacher.nameBn,
        teacher.designation,
        phone(teacher.membership.user.phone),
        day(teacher.joiningDate),
        teacher.qualification,
        teacher.mpoIndex,
        teacher.gender ? tGender(teacher.gender) : "",
        tStatus(teacher.status),
      ]),
    };
  };

  return <ExportMenu load={load} className={className} />;
}
