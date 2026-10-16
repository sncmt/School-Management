"use client";

import { Eye, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
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
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useLocalizedName } from "@/lib/i18n/names";
import { TEACHER_STATUSES, useTeachers, type Teacher, type TeacherStatus } from "@/lib/school/teachers";
import { cn } from "@/lib/utils";
import { TeacherCredentialsDialog, type TeacherCredentials } from "./TeacherCredentialsDialog";
import { TeacherFormDialog } from "./TeacherFormDialog";
import { TeacherStatusBadge } from "./TeacherStatusBadge";

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);

  const { data, isPending, isError, error, isFetching, refetch } = useTeachers({
    page,
    limit,
    search: search || undefined,
    status,
  });

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [credentials, setCredentials] = useState<TeacherCredentials | null>(null);

  const teachers = data?.items ?? [];
  const filtering = !!search || !!status;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {can("teacher:create") && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            aria-label={tCommon("search")}
            className="pl-8"
          />
        </div>
        <Select
          value={status ?? ALL}
          onValueChange={(v) => {
            setStatus(v === ALL ? undefined : (v as TeacherStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" aria-label={t("columns.status")}>
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
        <Link href={`/teachers/${teacher.id}`} className="font-medium hover:underline">
          {name(teacher)}
        </Link>
        {teacher.designation && <div className="text-xs text-muted-foreground">{teacher.designation}</div>}
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
