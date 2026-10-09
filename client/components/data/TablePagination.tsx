"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limits?: number[];
  disabled?: boolean;
};

/** "Showing 1–10 of 45 · Rows per page [10] · Page 1 of 5 ‹ ›" under a server-paginated table. */
export function TablePagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  limits = [10, 20, 50],
  disabled,
}: Props) {
  const t = useTranslations("pagination");
  const format = useFormatter();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{t("summary", { from, to, total })}</span>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span>{t("rowsPerPage")}</span>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))} disabled={disabled}>
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limits.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {format.number(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span>{t("page", { page, pages: totalPages })}</span>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label={t("previous")}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label={t("next")}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
