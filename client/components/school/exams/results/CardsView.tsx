"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useFinalCards } from "@/lib/school/finalResults";
import { useResultCards } from "@/lib/school/results";
import { ResultCardView } from "./ResultCardView";

const ALL = "all";

/**
 * A published class result's cards (an exam's, or a final result's): a section's, or one
 * student's, ready to print (one per page).
 */
export function CardsView({ examId, formulaId, classId }: { examId?: string; formulaId?: string; classId: string }) {
  const t = useTranslations("school.exams.results.cards");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const classes = useClasses();
  const sections = classes.data?.items.find((c) => c.id === classId)?.sections ?? [];
  const realSections = sections.filter((s) => !s.isDefault);
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [enrollmentId, setEnrollmentId] = useState<string>(ALL);
  const shownSection = sectionId ?? (realSections[0] ?? sections[0])?.id;
  const examCards = useResultCards(examId && shownSection ? { examId, classId, sectionId: shownSection } : null);
  const finalCards = useFinalCards(formulaId, shownSection ? { sectionId: shownSection } : null);
  const { data, isPending, isError, error, refetch } = formulaId ? finalCards : examCards;
  const cards = data ? (enrollmentId === ALL ? data.cards : data.cards.filter((c) => c.enrollmentId === enrollmentId)) : [];

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-end gap-2">
        {realSections.length > 0 && (
          <Select
            value={shownSection ?? ""}
            onValueChange={(v) => {
              setSectionId(v);
              setEnrollmentId(ALL);
            }}
          >
            <SelectTrigger className="w-36" label={t("section")} required>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {realSections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t("sectionName", { name: s.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {data && (
          <Select value={enrollmentId} onValueChange={setEnrollmentId}>
            <SelectTrigger className="w-60" label={t("student")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allStudents", { count: data.cards.length })}</SelectItem>
              {data.cards.map((c) => (
                <SelectItem key={c.enrollmentId} value={c.enrollmentId}>
                  {c.rollNumber ? `${c.rollNumber} · ` : ""}
                  {name(c.student)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={cards.length === 0}>
          <Printer /> {t("print", { count: cards.length })}
        </Button>
        <span className="text-xs text-muted-foreground">{t("printHint")}</span>
      </div>

      {isPending && !!shownSection ? (
        <Skeleton className="h-[600px]" />
      ) : isError ? (
        <div className="no-print flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : cards.length === 0 ? (
        <p className="no-print rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        // on screen the cards scroll sideways on small screens; in print each card is a page
        <div className="overflow-x-auto rounded-md bg-muted/40 p-4 print:overflow-visible print:bg-transparent print:p-0">
          <div className="print-area space-y-6 print:space-y-0">
            {cards.map((card) => (
              <div key={card.enrollmentId} className="print-page shadow-sm print:shadow-none">
                <ResultCardView data={data!} card={card} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
