"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAuditLog, useAuditLogEntry, type AuditLogEntry } from "@/lib/school/auditLog";
import { cn } from "@/lib/utils";
import { Pager } from "../finance/collect/PaymentsTab";
import { ListState } from "../finance/shared";
import { PageHero } from "@/components/layout/PageHero";

const ALL = "all";
// the filter: what kind of record (an action prefix on the server)
const KINDS = ["payment", "expense", "fund", "student_fee", "student", "teacher", "attendance", "academic_year", "exam"] as const;
const MONEY = new Set(["payment", "expense", "fund", "student_fee"]);

/** Every deletion and money reversal in the school: when, who, what and why (super admin only). */
export function ActivityLogPage() {
  const t = useTranslations("activityLog");
  const me = useSchoolMe();
  const format = useFormatter();
  const [kind, setKind] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const log = useAuditLog({ page, limit: 30, ...(kind !== ALL ? { action: kind } : {}) });

  if (me && !me.isSuperAdmin) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("superAdminOnly")}</p>;
  }

  const items = log.data?.items ?? [];

  return (
    <div className="space-y-2">
      <PageHero title={t("title")} description={t("description")} />

      <Select
        value={kind}
        onValueChange={(v) => {
          setKind(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-56" label={t("kind")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allKinds")}</SelectItem>
          {KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {t(`kinds.${k}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ListState isPending={log.isPending} error={log.error} onRetry={() => log.refetch()} empty={items.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", log.isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.when")}</TableHead>
                <TableHead>{t("columns.what")}</TableHead>
                <TableHead>{t("columns.who")}</TableHead>
                <TableHead>{t("columns.reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setOpenId(e.id)}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format.dateTime(new Date(e.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}
                  </TableCell>
                  <TableCell>
                    <ActionLabel entry={e} />
                    <div className="text-xs text-muted-foreground">{e.summary}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.actorName}
                    {e.viaPlatform && (
                      <Badge variant="outline" className="ms-2">
                        {t("platform")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 text-sm text-muted-foreground">{e.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListState>
      {log.data && log.data.meta.totalPages > 1 && <Pager page={page} totalPages={log.data.meta.totalPages} onPage={setPage} />}

      <EntryDialog logId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ActionLabel({ entry }: { entry: AuditLogEntry }) {
  const t = useTranslations("activityLog");
  const kind = entry.action.split(".")[0];
  // "payment.cancel" -> actions.payment.cancel; an action without a translation shows as it is
  const actionKey = `actions.${entry.action}` as Parameters<typeof t>[0];
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      {t.has(actionKey) ? t(actionKey) : entry.action}
      {MONEY.has(kind) && <Badge variant="secondary">{t("money")}</Badge>}
    </div>
  );
}

/* One entry with the copy of the record as it was. */
function EntryDialog({ logId, onClose }: { logId: string | null; onClose: () => void }) {
  const t = useTranslations("activityLog");
  const describeError = useErrorMessage();
  const entry = useAuditLogEntry(logId);

  return (
    <Dialog open={!!logId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry.data ? <ActionLabel entry={entry.data} /> : t("detailTitle")}</DialogTitle>
          <DialogDescription>{entry.data?.summary}</DialogDescription>
        </DialogHeader>
        {entry.isPending ? (
          <Skeleton className="h-48" />
        ) : entry.error ? (
          <p className="text-sm text-destructive">{describeError(entry.error)}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("snapshot")}</p>
            <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
              {JSON.stringify(entry.data?.snapshot, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
