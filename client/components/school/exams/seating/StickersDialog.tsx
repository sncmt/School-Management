"use client";

import { Printer } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import type { SeatPlanStudent, SeatPlanView } from "@/lib/school/seatPlan";
import { cn } from "@/lib/utils";

/*
 * Desk stickers: one card per seated student, in room and seat order, to cut out and stick
 * on the benches. A4, 10 mm margins (190 x 277 mm to print on): 24 small cards (3 x 8) or
 * 12 large ones (2 x 6) a sheet, each room on its own sheets if wanted.
 */

const SIZES = {
  small: { cols: 3, rows: 8 },
  large: { cols: 2, rows: 6 },
} as const;
type Size = keyof typeof SIZES;

type Sticker = { key: string; room: string; seatNo: number; student: SeatPlanStudent };

const ALL = "all";

export function StickersDialog({ view, open, onClose }: { view: SeatPlanView; open: boolean; onClose: () => void }) {
  const t = useTranslations("school.exams.seating.stickers");
  const tCommon = useTranslations("common");
  const [roomId, setRoomId] = useState<string>(ALL);
  const [size, setSize] = useState<Size>("small");
  const [roomPerPage, setRoomPerPage] = useState(true);
  const plan = view.plan;

  const stickers = useMemo(() => {
    if (!plan) return [];
    const studentOf = new Map(view.students.map((s) => [s.enrollmentId, s]));
    return plan.rooms
      .filter((r) => roomId === ALL || r.roomId === roomId)
      .map((r) =>
        plan.seats
          .filter((s) => s.roomId === r.roomId && studentOf.get(s.enrollmentId)?.onRoll)
          .sort((a, b) => a.seatNo - b.seatNo)
          .map((s) => ({ key: `${r.roomId}:${s.seatNo}`, room: r.number, seatNo: s.seatNo, student: studentOf.get(s.enrollmentId)! })),
      )
      .filter((list) => list.length > 0);
  }, [plan, view.students, roomId]);

  // sheets of cards: each room starts a new sheet, or the rooms run on
  const perPage = SIZES[size].cols * SIZES[size].rows;
  const pages = useMemo(() => {
    const chunk = (list: Sticker[]) => Array.from({ length: Math.ceil(list.length / perPage) }, (_, i) => list.slice(i * perPage, (i + 1) * perPage));
    return roomPerPage ? stickers.flatMap(chunk) : chunk(stickers.flat());
  }, [stickers, perPage, roomPerPage]);
  const count = stickers.reduce((sum, list) => sum + list.length, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(860px,95vw)]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="w-44" aria-label={t("room")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allRooms")}</SelectItem>
              {plan?.rooms.map((r) => (
                <SelectItem key={r.roomId} value={r.roomId}>
                  {t("roomName", { number: r.number })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={size} onValueChange={(v) => setSize(v as Size)}>
            <SelectTrigger className="w-52" aria-label={t("size")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SIZES) as Size[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`sizes.${s}`, { count: SIZES[s].cols * SIZES[s].rows })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roomId === ALL && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={roomPerPage} onCheckedChange={setRoomPerPage} />
              {t("roomPerPage")}
            </label>
          )}
        </div>

        {/* the first sheet, as it prints */}
        <div className="overflow-x-auto rounded-md bg-muted/40 p-3">
          {pages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("none")}</p>
          ) : (
            <div className="mx-auto w-[190mm] bg-white p-0 text-black shadow-sm">
              <Sheet stickers={pages[0]} size={size} view={view} />
            </div>
          )}
        </div>

        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">
            {t("count", { stickers: count, pages: pages.length })} · {t("printHint")}
          </span>
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
          <Button onClick={() => window.print()} disabled={pages.length === 0}>
            <Printer /> {t("print")}
          </Button>
        </DialogFooter>

        {open &&
          pages.length > 0 &&
          createPortal(
            <div className="print-area hidden bg-white text-black print:block">
              {pages.map((page, i) => (
                <div key={i} className="print-page">
                  <Sheet stickers={page} size={size} view={view} />
                </div>
              ))}
            </div>,
            document.body,
          )}
      </DialogContent>
    </Dialog>
  );
}

/* One A4 sheet of cards, the cut lines dashed. */
function Sheet({ stickers, size, view }: { stickers: Sticker[]; size: Size; view: SeatPlanView }) {
  const { cols, rows } = SIZES[size];
  return (
    <div
      className="grid w-[190mm]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: `${Math.floor(277 / rows)}mm` }}
    >
      {stickers.map((s) => (
        <Card key={s.key} sticker={s} size={size} view={view} />
      ))}
    </div>
  );
}

function Card({ sticker, size, view }: { sticker: Sticker; size: Size; view: SeatPlanView }) {
  const t = useTranslations("school.exams.seating.stickers");
  const format = useFormatter();
  const name = useLocalizedName();
  const me = useSchoolMe();
  const s = sticker.student;
  const className = view.classes.find((c) => c.id === s.classId)?.name ?? "";
  const large = size === "large";
  return (
    <div className={cn("flex flex-col justify-between overflow-hidden border border-dashed border-neutral-400 leading-tight", large ? "p-[4mm]" : "p-[2.5mm]")}>
      <div className={cn("flex items-baseline justify-between gap-2 text-neutral-600", large ? "text-[9pt]" : "text-[6.5pt]")}>
        <span className="truncate">{me ? name(me.school) : ""}</span>
        <span className="shrink-0 truncate">{name(view.exam)}</span>
      </div>
      <div className={cn("font-bold", large ? "text-[15pt]" : "text-[11pt]")}>
        {t("roomSeat", { room: sticker.room, seat: format.number(sticker.seatNo) })}
      </div>
      <div className={cn("truncate font-semibold", large ? "text-[13pt]" : "text-[9pt]")}>{name(s)}</div>
      <div className={cn("flex flex-wrap gap-x-[3mm]", large ? "text-[10pt]" : "text-[7.5pt]")}>
        <span>{t("class", { name: className })}</span>
        {!s.section.isDefault && <span>{t("section", { name: s.section.name })}</span>}
        {s.rollNumber && <span className="font-semibold">{t("roll", { roll: s.rollNumber })}</span>}
      </div>
    </div>
  );
}
