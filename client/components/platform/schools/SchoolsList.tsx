"use client";

import { ExternalLink, Eye, MoreHorizontal, Pencil, Plus, Power, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  SCHOOL_STATUSES,
  schoolActions,
  useSchools,
  type School,
  type SchoolStatus,
} from "@/lib/platform/schools";
import { schoolSiteUrl } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { ActivateSchoolDialog } from "./ActivateSchoolDialog";
import { SchoolStatusBadge } from "./SchoolStatusBadge";
import { PAGE_SIZES, SCHOOL_SORTS, useSchoolListParams, type SchoolSort } from "./useSchoolListParams";

const ALL = "ALL"; // Select can't hold an empty value

const COLUMNS = ["school", "code", "subdomain", "contact", "language", "status", "created"] as const;

export function SchoolsList() {
  const t = useTranslations("platform.schools");
  const tStatus = useTranslations("statuses");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const params = useSchoolListParams();
  const { data, isPending, isError, error, isFetching, refetch } = useSchools(params.query);
  const [activating, setActivating] = useState<School | null>(null);

  // search box: typed text goes to the URL (and the server) once typing pauses
  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearch = useDebouncedValue(searchInput.trim());
  const { search: urlSearch, update } = params;
  const syncedSearch = useRef(urlSearch); // the value box and URL last agreed on

  useEffect(() => {
    if (debouncedSearch === syncedSearch.current) return; // nothing new typed
    syncedSearch.current = debouncedSearch;
    if (debouncedSearch !== urlSearch) update({ search: debouncedSearch, page: 1 });
  }, [debouncedSearch, urlSearch, update]);

  // the URL changed elsewhere (back button, clear filters): show it in the box
  useEffect(() => {
    if (urlSearch === syncedSearch.current) return;
    syncedSearch.current = urlSearch;
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const clearFilters = () => params.update({ search: "", status: undefined, page: 1 });

  const schools = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/schools/new">
            <Plus /> {t("create")}
          </Link>
        </Button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={tCommon("search")}
            className="pl-8"
          />
        </div>

        <Select
          value={params.status ?? ALL}
          onValueChange={(v) => params.update({ status: v === ALL ? undefined : (v as SchoolStatus), page: 1 })}
        >
          <SelectTrigger className="w-44" aria-label={t("columns.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {SCHOOL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {tStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={params.sort} onValueChange={(v) => params.update({ sort: v as SchoolSort, page: 1 })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SCHOOL_SORTS) as SchoolSort[]).map((sort) => (
              <SelectItem key={sort} value={sort}>
                {t(`sort.${sort}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* table */}
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
            ) : schools.length === 0 ? (
              <MessageRow>
                <p>{params.hasFilters ? t("emptyFiltered") : t("empty")}</p>
                {params.hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {t("clearFilters")}
                  </Button>
                )}
              </MessageRow>
            ) : (
              schools.map((school) => (
                <SchoolRow key={school.id} school={school} onActivate={() => setActivating(school)} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.total > 0 && (
        <TablePagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          limits={PAGE_SIZES}
          onPageChange={(page) => params.update({ page })}
          onLimitChange={(limit) => params.update({ limit, page: 1 })}
          disabled={isFetching}
        />
      )}

      <ActivateSchoolDialog school={activating} onClose={() => setActivating(null)} />
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

function SchoolRow({ school, onActivate }: { school: School; onActivate: () => void }) {
  const t = useTranslations("platform.schools");
  const tLanguage = useTranslations("languages");
  const format = useFormatter();
  const actions = schoolActions(school);
  const isActive = actions.openSite;

  return (
    <TableRow>
      <TableCell>
        <Link href={`/schools/${school.id}`} className="font-medium hover:underline">
          {school.nameEn}
        </Link>
        {school.nameBn && <div className="text-xs text-muted-foreground">{school.nameBn}</div>}
      </TableCell>
      <TableCell className="font-mono text-xs">{school.schoolCode}</TableCell>
      <TableCell>
        {isActive ? (
          <a
            href={schoolSiteUrl(school.subdomain)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            {school.subdomain}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          school.subdomain
        )}
      </TableCell>
      <TableCell>
        <div>{school.email}</div>
        {school.phone && <div className="text-xs text-muted-foreground">{school.phone}</div>}
      </TableCell>
      <TableCell>{tLanguage(school.language)}</TableCell>
      <TableCell>
        <SchoolStatusBadge status={school.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {format.dateTime(new Date(school.createdAt), { dateStyle: "medium" })}
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
              <Link href={`/schools/${school.id}`}>
                <Eye /> {t("view")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/schools/${school.id}/edit`}>
                <Pencil /> {t("edit")}
              </Link>
            </DropdownMenuItem>
            {actions.activate && (
              <DropdownMenuItem onSelect={onActivate}>
                <Power /> {t("activate.action")}
              </DropdownMenuItem>
            )}
            {actions.openSite && (
              <DropdownMenuItem asChild>
                <a href={schoolSiteUrl(school.subdomain)} target="_blank" rel="noreferrer">
                  <ExternalLink /> {t("openSite")}
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
