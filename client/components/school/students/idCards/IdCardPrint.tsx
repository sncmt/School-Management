"use client";

import { createPortal } from "react-dom";
import type { IdCard, IdCardData } from "@/lib/school/idCards";
import { CARD_WIDTH, IdCardBack, IdCardFront } from "./IdCardTemplates";

/*
 * Portrait cards on A4 sheets, to cut out (190 x 277 mm inside the margins): 3 x 3, nine a
 * sheet. With the backs, each sheet of fronts is followed by its sheet of backs with every
 * row mirrored, so printing on both sides lines them up.
 */

const GAP = 2;
export const SHEET = { cols: 3, rows: 3 } as const;
export const PER_SHEET = SHEET.cols * SHEET.rows;

export function IdCardPrint({ data, withBacks }: { data: IdCardData; withBacks: boolean }) {
  const { cols } = SHEET;
  const sheets = Array.from({ length: Math.ceil(data.cards.length / PER_SHEET) }, (_, i) => data.cards.slice(i * PER_SHEET, (i + 1) * PER_SHEET));

  const grid = (children: React.ReactNode, key: string) => (
    <div key={key} className="print-page">
      <div className="grid justify-center" style={{ gridTemplateColumns: `repeat(${cols}, ${CARD_WIDTH}mm)`, gap: `${GAP}mm` }}>
        {children}
      </div>
    </div>
  );

  // the backs of one sheet, each row reversed (the sheet is turned over along its long side)
  const backs = (sheet: IdCard[]) => {
    const cells: (IdCard | null)[] = [];
    for (let r = 0; r < Math.ceil(sheet.length / cols); r++) {
      const row: (IdCard | null)[] = sheet.slice(r * cols, (r + 1) * cols);
      while (row.length < cols) row.push(null);
      cells.push(...row.reverse());
    }
    return cells.map((card, i) =>
      card ? <IdCardBack key={card.id} school={data.school} settings={data.settings} year={data.academicYear} /> : <div key={`empty-${i}`} />,
    );
  };

  return createPortal(
    <div className="print-area hidden bg-white print:block">
      {sheets.flatMap((sheet, i) => [
        grid(
          sheet.map((card) => <IdCardFront key={card.id} school={data.school} settings={data.settings} year={data.academicYear} card={card} />),
          `front-${i}`,
        ),
        ...(withBacks && data.settings.showBack ? [grid(backs(sheet), `back-${i}`)] : []),
      ])}
    </div>,
    document.body,
  );
}
