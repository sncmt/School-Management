"use client";

import { ArrowDownToLine, Eye, Globe, MoreHorizontal, Paperclip, Pencil, Pin, Plus, Search, Send, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  NOTICE_STATES,
  noticesApi,
  useDeleteNotice,
  usePublishNotice,
  useUnpublishNotice,
  useNoticeList,
  type NoticeRow,
  type NoticeState,
} from "@/lib/school/notices";
import { Pager } from "../finance/collect/PaymentsTab";
import { CategoryBadge, NoticeReader, StateLabel, useNoticeDate, type ReadableNotice } from "./shared";

const COLUMNS = ["title", "audience", "state", "reads"] as const;
const PAGE_SIZE = 20;

/** Every notice of the school, drafts and old ones too, with writing and publishing. */
export function NoticeManager({
  canCreate,
  canPublish,
  onWrite,
  onEdit,
}: {
  canCreate: boolean;
  canPublish: boolean;
  onWrite: () => void;
  onEdit: (noticeId: string) => void;
}) {
  const t = useTranslations("school.notices.manage");
  const tStates = useTranslations("school.notices.states");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const me = useSchoolMe();
  const [state, setState] = useState<NoticeState | "ALL">("ALL");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<NoticeRow | null>(null);
  const [viewing, setViewing] = useState<ReadableNotice | null>(null);
  const publish = usePublishNotice();
  const unpublish = useUnpublishNotice();

  // search as the person types, after a short pause
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isPending, error, refetch } = useNoticeList({
    page,
    limit: PAGE_SIZE,
    state: state === "ALL" ? undefined : state,
    search: search || undefined,
  });

  const view = async (row: NoticeRow) => {
    try {
      setViewing(await noticesApi.get(row.id));
    } catch (e) {
      toast.error(describeError(e));
    }
  };

  const doPublish = (row: NoticeRow) =>
    publish.mutate(
      { noticeId: row.id },
      {
        onSuccess: (n) => toast.success(n.state === "SCHEDULED" ? t("scheduled", { title: row.title }) : t("published", { title: row.title })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  const doUnpublish = (row: NoticeRow) =>
    unpublish.mutate(row.id, {
      onSuccess: () => toast.success(t("unpublished", { title: row.title })),
      onError: (e) => toast.error(describeError(e)),
    });

  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={t("search")} className="pl-8" />
        </div>
        <Select
          value={state}
          onValueChange={(v) => {
            setState(v as NoticeState | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStates")}</SelectItem>
            {NOTICE_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStates(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button className="sm:ml-auto" onClick={onWrite}>
            <Plus /> {t("write")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c} className={c === "reads" ? "text-right" : undefined}>
                  {t(`columns.${c}`)}
                </TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{tCommon("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <MessageRow>
                <p>{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>
                <p>{search || state !== "ALL" ? t("noMatch") : t("empty")}</p>
              </MessageRow>
            ) : (
              rows.map((row) => {
                const published = row.status === "PUBLISHED";
                const mayEdit = canCreate && (!published || canPublish);
                const mayDelete = canPublish || (canCreate && !published && row.authorId === me?.user.id);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-md">
                      <button type="button" onClick={() => view(row)} className="block text-left font-medium hover:underline">
                        {row.title}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <CategoryBadge category={row.category} />
                        {row.pinned && <Pin className="size-3.5" aria-label={t("pinned")} />}
                        {row.isPublic && <Globe className="size-3.5" aria-label={t("public")} />}
                        {row.attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Paperclip className="size-3.5" /> {row.attachmentCount}
                          </span>
                        )}
                        {row.author && <span>{t("by", { name: row.author })}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AudienceCell row={row} />
                    </TableCell>
                    <TableCell>
                      <StateCell row={row} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{published ? row.readCount : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={tCommon("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => view(row)}>
                            <Eye /> {t("view")}
                          </DropdownMenuItem>
                          {mayEdit && (
                            <DropdownMenuItem onSelect={() => onEdit(row.id)}>
                              <Pencil /> {t("edit")}
                            </DropdownMenuItem>
                          )}
                          {canPublish && !published && (
                            <DropdownMenuItem onSelect={() => doPublish(row)}>
                              <Send /> {t("publish")}
                            </DropdownMenuItem>
                          )}
                          {canPublish && published && (
                            <DropdownMenuItem onSelect={() => doUnpublish(row)}>
                              <ArrowDownToLine /> {t("unpublish")}
                            </DropdownMenuItem>
                          )}
                          {mayDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(row)}>
                                <Trash2 /> {t("delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && <Pager page={page} totalPages={data.meta.totalPages} onPage={setPage} />}

      <NoticeReader notice={viewing} onClose={() => setViewing(null)} />
      <DeleteNoticeDialog notice={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function AudienceCell({ row }: { row: NoticeRow }) {
  const tAudience = useTranslations("school.notices.audiences");
  const t = useTranslations("school.notices.manage");
  return (
    <div className="space-y-1">
      <div className="text-sm">{tAudience(row.audience)}</div>
      {row.audience === "FAMILIES" &&
        (row.targets.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("allFamilies")}</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.targets.map((target) => (
              <Badge key={`${target.class.id}-${target.section?.id ?? ""}`} variant="secondary" className="font-normal">
                {target.section && !target.section.isDefault ? `${target.class.name} · ${target.section.name}` : target.class.name}
              </Badge>
            ))}
          </div>
        ))}
    </div>
  );
}

function StateCell({ row }: { row: NoticeRow }) {
  const t = useTranslations("school.notices.manage");
  const date = useNoticeDate();
  const format = useFormatter();
  const when =
    row.state === "SCHEDULED" && row.publishAt
      ? t("goesUp", { date: date(row.publishAt, true) })
      : row.state === "LIVE" && row.expiresAt
        ? t("until", { date: date(row.expiresAt, true) })
        : row.state === "LIVE" && row.publishAt
          ? t("since", { date: date(row.publishAt) })
          : row.state === "EXPIRED" && row.expiresAt
            ? t("ended", { date: date(row.expiresAt) })
            : t("written", { when: format.relativeTime(new Date(row.createdAt)) });
  return (
    <div className="space-y-0.5">
      <StateLabel state={row.state} />
      <div className="text-xs text-muted-foreground">{when}</div>
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-28">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">{children}</div>
      </TableCell>
    </TableRow>
  );
}

function DeleteNoticeDialog({ notice, onClose }: { notice: NoticeRow | null; onClose: () => void }) {
  const t = useTranslations("school.notices.manage.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteNotice();

  const confirm = () => {
    if (!notice) return;
    remove.mutate(notice.id, {
      onSuccess: () => {
        toast.success(t("done", { title: notice.title }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };

  return (
    <AlertDialog open={!!notice} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { title: notice?.title ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
