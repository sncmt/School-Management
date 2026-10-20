"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useIdCards } from "@/lib/school/idCards";
import { IdCardPrint } from "./IdCardPrint";
import { IdCardBack, IdCardFront } from "./IdCardTemplates";

/** One student's ID card (their enrollment in a year), to see and print on its own. */
export function StudentIdCardDialog({ enrollment, open, onClose }: { enrollment: { id: string; academicYearId: string }; open: boolean; onClose: () => void }) {
  const t = useTranslations("school.idCards.single");
  const tPrint = useTranslations("school.idCards.print");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const [withBack, setWithBack] = useState(true);
  const { data, isPending, error } = useIdCards({ academicYearId: enrollment.academicYearId, enrollmentId: enrollment.id }, open);
  const card = data?.cards[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(760px,95vw)]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {isPending ? (
          <Skeleton className="h-56" />
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
        ) : !card ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("notOnRoll")}</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4 rounded-md bg-muted/40 p-4">
            <IdCardFront school={data.school} settings={data.settings} year={data.academicYear} card={card} />
            {data.settings.showBack && <IdCardBack school={data.school} settings={data.settings} year={data.academicYear} />}
          </div>
        )}
        <DialogFooter className="items-center">
          {data?.settings.showBack && card && (
            <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={withBack} onCheckedChange={setWithBack} />
              {tPrint("withBacks")}
            </label>
          )}
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
          <Button onClick={() => window.print()} disabled={!card}>
            <Printer /> {tPrint("print")}
          </Button>
        </DialogFooter>
        {open && data && card && <IdCardPrint data={data} withBacks={withBack} />}
      </DialogContent>
    </Dialog>
  );
}
