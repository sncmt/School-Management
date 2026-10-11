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

// how many page numbers to show at once
const PAGE_WINDOW = 5;

/** Up to PAGE_WINDOW page numbers around the current page, kept inside 1..totalPages. */
const visiblePages = (page: number, totalPages: number) => {
  const start = Math.max(1, Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW + 1));
  const end = Math.min(totalPages, start + PAGE_WINDOW - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/** "Showing 1–10 of 45 · Rows per page [10] · First ‹ 1 2 3 4 5 › Last" under a server-paginated table. */
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

        <nav className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={disabled || page <= 1}
          >
            {t("first")}
          </Button>
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

          {visiblePages(page, totalPages).map((n) => (
            <Button
              key={n}
              variant={n === page ? "default" : "outline"}
              size="sm"
              className="min-w-8"
              onClick={() => onPageChange(n)}
              disabled={disabled}
              aria-current={n === page ? "page" : undefined}
              aria-label={t("goToPage", { page: n })}
            >
              {format.number(n)}
            </Button>
          ))}

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || page >= totalPages}
          >
            {t("last")}
          </Button>
        </nav>
      </div>
    </div>
  );
}
