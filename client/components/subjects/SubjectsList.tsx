"use client";

import { Lock, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { subjectKind, useSubjects, type Subject, type SubjectKind, type SubjectScope } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { DeleteSubjectDialog } from "./DeleteSubjectDialog";
import { SubjectFormDialog } from "./SubjectFormDialog";

type TypeFilter = "all" | SubjectKind;
type SourceFilter = "all" | Subject["source"];

/*
 * Each main subject is followed by its papers, so "Bangla" sits right above
 * "Bangla 1st Paper". A paper whose main subject isn't in the list (search,
 * filter) keeps its own place.
 */
const withPapersUnderParents = (subjects: Subject[]) => {
  const shown = new Set(subjects.map((s) => s.id));
  const papersOf = new Map<string, Subject[]>();
  for (const s of subjects) {
    if (s.parentId && shown.has(s.parentId)) {
      papersOf.set(s.parentId, [...(papersOf.get(s.parentId) ?? []), s]);
    }
  }
  return subjects.flatMap((s) => (s.parentId && shown.has(s.parentId) ? [] : [s, ...(papersOf.get(s.id) ?? [])]));
};

/*
 * PLATFORM: the NCTB list, all editable by the platform admin.
 * SCHOOL: the NCTB list (read-only) plus the school's own subjects, which the school
 * can change with the subject:* permissions.
 */
export function SubjectsList({ scope }: { scope: SubjectScope }) {
  const t = useTranslations("platform.subjects");
  const tSchool = useTranslations("school.subjects");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const isSchool = scope === "SCHOOL";

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const { data, isPending, isError, error, isFetching, refetch } = useSubjects(scope, search);
  // the full list, for choosing a paper's main subject while the table is filtered
  const { data: allSubjects = [] } = useSubjects(scope);

  const [editing, setEditing] = useState<Subject | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  // the platform admin may do everything; a school only to its own subjects, with permission
  const permissions = {
    create: !isSchool || can("subject:create"),
    update: !isSchool || can("subject:update"),
    delete: !isSchool || can("subject:delete"),
  };

  const rows = useMemo(() => {
    const filtered = (data ?? []).filter(
      (s) =>
        (typeFilter === "all" || subjectKind(s) === typeFilter) &&
        (sourceFilter === "all" || s.source === sourceFilter),
    );
    return withPapersUnderParents(filtered);
  }, [data, typeFilter, sourceFilter]);

  const filtering = !!search || typeFilter !== "all" || sourceFilter !== "all";
  const columns = isSchool
    ? ([["code", t("columns.code")], ["nameEn", t("columns.nameEn")], ["nameBn", t("columns.nameBn")], ["type", t("columns.type")], ["source", tSchool("columns.source")]] as const)
    : ([["code", t("columns.code")], ["nameEn", t("columns.nameEn")], ["nameBn", t("columns.nameBn")], ["type", t("columns.type")]] as const);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{isSchool ? tSchool("title") : t("title")}</h1>
          <p className="text-sm text-muted-foreground">{isSchool ? tSchool("description") : t("description")}</p>
        </div>
        {permissions.create && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> {isSchool ? tSchool("add") : t("add")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        {isSchool && (
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
            <SelectTrigger className="w-40" aria-label={tSchool("columns.source")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "PLATFORM", "SCHOOL"] as const).map((source) => (
                <SelectItem key={source} value={source}>
                  {tSchool(`sources.${source}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-48" aria-label={t("columns.type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["all", "main", "paper", "religion"] as const).map((type) => (
              <SelectItem key={type} value={type}>
                {t(`types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{t("count", { count: rows.length })}</span>}
      </div>

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(([key, label]) => (
                <TableHead key={key}>{label}</TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <MessageRow span={columns.length + 1}>
                <p>{t("loadFailed")}</p>
                <p className="text-xs">{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow span={columns.length + 1}>
                <p>{filtering ? t("emptyFiltered") : t("empty")}</p>
              </MessageRow>
            ) : (
              rows.map((subject) => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  showSource={isSchool}
                  // a school can never change an NCTB subject
                  editable={!isSchool || subject.source === "SCHOOL"}
                  permissions={permissions}
                  nested={!!subject.parentId && rows.some((r) => r.id === subject.parentId)}
                  onEdit={() => setEditing(subject)}
                  onDelete={() => setDeleting(subject)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SubjectFormDialog
        scope={scope}
        open={adding || !!editing}
        subject={editing}
        subjects={allSubjects}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <DeleteSubjectDialog scope={scope} subject={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function MessageRow({ span, children }: { span: number; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={span} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SubjectRow({
  subject,
  showSource,
  editable,
  permissions,
  nested,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  showSource: boolean;
  editable: boolean;
  permissions: { update: boolean; delete: boolean };
  // shown right under its main subject: indent it
  nested: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("platform.subjects");
  const tSchool = useTranslations("school.subjects");
  const tReligion = useTranslations("religions");
  const name = useLocalizedName();
  const kind = subjectKind(subject);
  const empty = <span className="text-muted-foreground">—</span>;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{subject.code ?? "—"}</TableCell>
      <TableCell className={cn(nested && "pl-8")}>
        <span className={cn(!nested && "font-medium")}>{subject.nameEn ?? empty}</span>
      </TableCell>
      <TableCell lang="bn" className={cn(nested && "pl-8")}>
        {subject.nameBn ?? empty}
      </TableCell>
      <TableCell>
        {kind === "paper" && subject.parent ? (
          <Badge variant="outline">{t("type.paper", { parent: name(subject.parent) })}</Badge>
        ) : kind === "religion" && subject.religion ? (
          <Badge variant="secondary">{t("type.religion", { religion: tReligion(subject.religion) })}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("type.main")}
            {subject.papers.length > 0 && ` · ${t("papersCount", { count: subject.papers.length })}`}
          </span>
        )}
      </TableCell>
      {showSource && (
        <TableCell>
          <Badge variant={subject.source === "SCHOOL" ? "default" : "outline"}>
            {tSchool(`sources.${subject.source}`)}
          </Badge>
        </TableCell>
      )}
      <TableCell>
        {!editable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex size-8 items-center justify-center text-muted-foreground">
                <Lock className="size-3.5" aria-label={tSchool("readOnly")} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{tSchool("readOnly")}</TooltipContent>
          </Tooltip>
        ) : (
          (permissions.update || permissions.delete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {permissions.update && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil /> {t("edit")}
                  </DropdownMenuItem>
                )}
                {permissions.delete && (
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 /> {t("delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </TableCell>
    </TableRow>
  );
}
