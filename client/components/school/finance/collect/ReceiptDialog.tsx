"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useReceipt } from "@/lib/school/collection";
import { useFamilyReceipt } from "@/lib/school/family";
import { cn } from "@/lib/utils";
import { ReceiptCompact, ReceiptToken, ReceiptView } from "./ReceiptView";

// A4: a student copy and an office copy on one sheet; A6: a quarter of A4; tokens: thermal rolls
export const RECEIPT_SIZES = ["A4", "A6", "TOKEN80", "TOKEN58"] as const;
export type ReceiptSize = (typeof RECEIPT_SIZES)[number];
const SIZE_KEY = "receipt-size";

/* The size last printed on this browser (a convenience: A4 when storage is off). */
const savedSize = (): ReceiptSize => {
  try {
    const v = window.localStorage.getItem(SIZE_KEY);
    return (RECEIPT_SIZES as readonly string[]).includes(v ?? "") ? (v as ReceiptSize) : "A4";
  } catch {
    return "A4";
  }
};
const saveSize = (size: ReceiptSize) => {
  try {
    window.localStorage.setItem(SIZE_KEY, size);
  } catch {
    // private window or storage off: it just isn't remembered
  }
};

/**
 * A payment's money receipt, in the size chosen: a student copy and an office copy on one A4
 * sheet, one copy on a quarter of A4 (A6), or a token for an 80 mm or 58 mm thermal printer.
 * The printed copy sits directly under <body>, outside the dialog, so the print layout isn't
 * moved by the dialog's positioning.
 */
export function ReceiptDialog({ paymentId, onClose, family = false }: { paymentId: string | null; onClose: () => void; family?: boolean }) {
  const t = useTranslations("school.finance.receipt");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  // the family login reads its own children's receipts (it has no finance permission)
  const office = useReceipt(family ? null : paymentId);
  const own = useFamilyReceipt(family ? paymentId : null);
  const { data, isPending, error } = family ? own : office;
  const [size, setSize] = useState<ReceiptSize>(savedSize);
  const choose = (next: ReceiptSize) => {
    setSize(next);
    saveSize(next);
  };
  const one = (copy?: "student" | "office") =>
    data &&
    (size === "A4" ? (
      <ReceiptView receipt={data} copy={copy} />
    ) : size === "A6" ? (
      <ReceiptCompact receipt={data} />
    ) : (
      <ReceiptToken receipt={data} width={size === "TOKEN80" ? 80 : 58} />
    ));

  return (
    <Dialog open={!!paymentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(820px,95vw)]">
        <DialogHeader>
          <DialogTitle>{data ? t("dialogTitle", { no: data.receiptNo }) : t("title")}</DialogTitle>
        </DialogHeader>
        {isPending ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("size")}>
              {RECEIPT_SIZES.map((s) => (
                <Button key={s} type="button" size="sm" variant={size === s ? "default" : "outline"} aria-pressed={size === s} onClick={() => choose(s)}>
                  {t(`sizes.${s}`)}
                </Button>
              ))}
            </div>
            <div className="overflow-x-auto rounded-md bg-muted/40 p-3">{one()}</div>
          </div>
        )}
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">{t(`sizeHints.${size}`)}</span>
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
          <Button onClick={() => window.print()} disabled={!data}>
            <Printer /> {t("print")}
          </Button>
        </DialogFooter>
        {data &&
          createPortal(
            <div
              className={cn(
                "print-area hidden print:block",
                size === "A4" && "space-y-[8mm]",
                size === "A6" && "print-receipt-a6",
                (size === "TOKEN80" || size === "TOKEN58") && "print-receipt-token",
              )}
            >
              {size === "A4" ? (
                <>
                  {one("student")}
                  <div className="border-t border-dashed border-neutral-400" />
                  {one("office")}
                </>
              ) : (
                one()
              )}
            </div>,
            document.body,
          )}
      </DialogContent>
    </Dialog>
  );
}
