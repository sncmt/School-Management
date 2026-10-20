"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { TablePagination } from "@/components/data/TablePagination";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { usePeriodLabel, useSubscriptions } from "@/lib/platform/subscriptions";
import { cn } from "@/lib/utils";
import { SchoolStatusBadge } from "../schools/SchoolStatusBadge";
import { StandingBadge } from "./StandingBadge";

const PAGE_SIZES = [20, 50, 100];
const COLUMNS = ["school", "plan", "paidThrough", "current", "status"] as const;

/** Every school's subscription: its plan, the last period paid, and whether this one is paid. */
export function SubscriptionsList() {
  const t = useTranslations("platform.subscriptions");
  const name = useLocalizedName();
  const period = usePeriodLabel();
  const describeError = useErrorMessage();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);
  const { data, isPending, isError, error, isFetching } = useSubscriptions({ page, limit, search: search || undefined });

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="px-5 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder={t("search")}
              aria-label={t("search")}
              className="pl-9"
            />
          </div>
        </div>
        <div className={cn("border-t transition-opacity", isFetching && !isPending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={c} className="first:pl-5 last:pr-5">
                    {t(`columns.${c}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {COLUMNS.map((c) => (
                      <TableCell key={c} className="py-3 first:pl-5 last:pr-5">
                        <Skeleton className="h-3.5 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLUMNS.length} className="h-32 text-center text-sm text-muted-foreground">
                    {describeError(error)}
                  </TableCell>
                </TableRow>
              ) : data.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLUMNS.length} className="h-32 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="py-3 pl-5">
                      <Link href={`/subscriptions/${s.id}`} className="font-medium hover:text-navy hover:underline">
                        {name(s)}
                      </Link>
                      <div className="text-xs text-muted-foreground">{s.subdomain}</div>
                    </TableCell>
                    <TableCell className="py-3">{s.subscriptionPlan ? t(`plans.${s.subscriptionPlan}`) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="py-3">
                      {s.paidThrough ? period(s.paidThrough) : <span className="text-muted-foreground">{t("nothingPaid")}</span>}
                      <div className="text-xs text-muted-foreground">{t("paymentsCount", { count: s.payments })}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <StandingBadge currentPaid={s.currentPaid} />
                    </TableCell>
                    <TableCell className="py-3 pr-5">
                      <SchoolStatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
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
