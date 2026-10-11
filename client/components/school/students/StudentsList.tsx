"use client";

import { Eye, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useClasses } from "@/lib/school/classes";
import {
  localPhone,
  STUDENT_STATUSES,
  useStudents,
  type StudentListItem,
  type StudentStatus,
} from "@/lib/school/students";
import { cn } from "@/lib/utils";
import { usePlacementLabel } from "./placement";
import { StudentAvatar } from "./StudentAvatar";
import { StudentStatusBadge } from "./StudentStatusBadge";

const ALL = "ALL";
const PAGE_SIZES = [20, 50, 100];
const COLUMNS = ["student", "class", "father", "family", "status"] as const;

export function StudentsList() {
  const t = useTranslations("school.students");
  const tStatus = useTranslations("studentStatuses");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const classes = useClasses();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [classId, setClassId] = useState<string | undefined>();
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [status, setStatus] = useState<StudentStatus | undefined>("ACTIVE");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);

  const { data, isPending, isError, error, isFetching, refetch } = useStudents({
    page,
    limit,
    search: search || undefined,
    status,
    classId,
    sectionId,
  });

  const sections = classes.data?.items.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const students = data?.items ?? [];
  const filtering = !!search || !!status || !!classId;

  // every filter change starts again from page 1
  const filter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {classes.data?.academicYear ? t("descriptionYear", { year: classes.data.academicYear.name }) : t("description")}
          </p>
        </div>
        {can("student:create") && (
          <Button asChild>
            <Link href="/students/new">
              <Plus /> {t("add")}
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => filter(setSearchInput)(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={tCommon("search")}
            className="pl-8"
          />
        </div>
        <Select
          value={classId ?? ALL}
          onValueChange={(v) => {
            filter(setClassId)(v === ALL ? undefined : v);
            setSectionId(undefined);
          }}
        >
          <SelectTrigger className="w-40" aria-label={t("columns.class")}>
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
          <Select value={sectionId ?? ALL} onValueChange={(v) => filter(setSectionId)(v === ALL ? undefined : v)}>
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
        <Select
          value={status ?? ALL}
          onValueChange={(v) => filter(setStatus)(v === ALL ? undefined : (v as StudentStatus))}
        >
          <SelectTrigger className="w-40" aria-label={t("columns.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {STUDENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{t(`columns.${column}`)}</TableHead>
              ))}
              <TableHead className="w-12">
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
            ) : students.length === 0 ? (
              <MessageRow>
                <p>{filtering ? t("emptyFiltered") : t("empty")}</p>
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
      )}
    </div>
  );
}

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

function StudentRow({ student, canUpdate }: { student: StudentListItem; canUpdate: boolean }) {
  const t = useTranslations("school.students");
  const name = useLocalizedName();
  const placement = usePlacementLabel();
  const href = `/students/${student.id}`;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <StudentAvatar photo={student.photo} />
          <div className="min-w-0">
            <Link href={href} className="font-medium hover:underline">
              {name(student)}
            </Link>
            <div className="text-xs text-muted-foreground">{t("admissionNoShort", { no: student.admissionNo })}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {student.enrollment ? (
          <>
            <div>{placement(student.enrollment)}</div>
            {student.enrollment.status !== "ACTIVE" && (
              <div className="text-xs text-muted-foreground">{student.enrollment.academicYear.name}</div>
            )}
          </>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>{student.fatherName}</TableCell>
      <TableCell className="whitespace-nowrap">
        {student.phone ? localPhone(student.phone) : <span className="text-muted-foreground">{t("noLogin")}</span>}
      </TableCell>
      <TableCell>
        <StudentStatusBadge status={student.status} />
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
