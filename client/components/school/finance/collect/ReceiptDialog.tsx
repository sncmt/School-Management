"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useReceipt } from "@/lib/school/collection";
import { useFamilyReceipt } from "@/lib/school/family";
import { ReceiptView } from "./ReceiptView";

/**
 * A payment's money receipt: shown on screen, printed as a student copy and an office
 * copy on one A4 sheet. The printed copy sits directly under <body>, outside the dialog,
 * so the print layout isn't moved by the dialog's positioning.
 */
export function ReceiptDialog({ paymentId, onClose, family = false }: { paymentId: string | null; onClose: () => void; family?: boolean }) {
  const t = useTranslations("school.finance.receipt");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  // the family login reads its own children's receipts (it has no finance permission)
  const office = useReceipt(family ? null : paymentId);
  const own = useFamilyReceipt(family ? paymentId : null);
  const { data, isPending, error } = family ? own : office;

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
          <div className="overflow-x-auto rounded-md bg-muted/40 p-3">
            <ReceiptView receipt={data} />
          </div>
        )}
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">{t("printHint")}</span>
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
          <Button onClick={() => window.print()} disabled={!data}>
            <Printer /> {t("print")}
          </Button>
        </DialogFooter>
        {data &&
          createPortal(
            <div className="print-area hidden space-y-[8mm] print:block">
              <ReceiptView receipt={data} copy="student" />
              <div className="border-t border-dashed border-neutral-400" />
              <ReceiptView receipt={data} copy="office" />
            </div>,
            document.body,
          )}
      </DialogContent>
    </Dialog>
  );
}
