"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useFamilyAdmitCard } from "@/lib/school/admitCards";
import { AdmitCardPrint, AdmitCardView } from "../exams/admit/AdmitCardView";

/** A child's admit card for one exam, to see and print at home. */
export function FamilyAdmitCardDialog({ query, onClose }: { query: { studentId: string; examId: string } | null; onClose: () => void }) {
  const t = useTranslations("school.exams.admit");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data, isPending, error } = useFamilyAdmitCard(query);
  const card = data?.cards[0];

  return (
    <Dialog open={!!query} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(820px,95vw)]">
        <DialogHeader>
          <DialogTitle>{t("card.title")}</DialogTitle>
        </DialogHeader>
        {isPending ? (
          <Skeleton className="h-80" />
        ) : error || !card ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
        ) : (
          <div className="overflow-x-auto rounded-md bg-muted/40 p-3">
            <AdmitCardView sheet={data} card={card} />
          </div>
        )}
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">{t("printHint")}</span>
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
          <Button onClick={() => window.print()} disabled={!card}>
            <Printer /> {t("print")}
          </Button>
        </DialogFooter>
        {data && card && <AdmitCardPrint sheet={data} />}
      </DialogContent>
    </Dialog>
  );
}
