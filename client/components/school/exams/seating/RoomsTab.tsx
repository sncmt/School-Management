"use client";

import { DoorOpen, ListPlus, MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useDeleteRoom, useRooms, useUpdateRoom, type Room } from "@/lib/school/rooms";
import { cn } from "@/lib/utils";
import { RoomFormDialog, RoomsBulkDialog } from "./RoomDialogs";

const COLUMNS = ["number", "building", "seats", "status"] as const;

/** The school's rooms for seat plans: number, building, seats. */
export function RoomsTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.seating.rooms");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const [showInactive, setShowInactive] = useState(false);
  const { data, isPending, error, refetch } = useRooms(showInactive);
  const update = useUpdateRoom();
  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [bulk, setBulk] = useState(false);
  const [deleting, setDeleting] = useState<Room | null>(null);

  const toggle = (room: Room) =>
    update.mutate(
      { roomId: room.id, body: { isActive: !room.isActive } },
      {
        onSuccess: () => toast.success(room.isActive ? t("deactivated", { number: room.number }) : t("activated", { number: room.number })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  const rooms = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {data && t("summary", { rooms: format.number(data.activeRooms), seats: format.number(data.activeSeats) })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            {t("showInactive")}
          </label>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setBulk(true)}>
                <ListPlus /> {t("addMany")}
              </Button>
              <Button onClick={() => setEditing("new")}>
                <Plus /> {t("add")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c} className={c === "seats" ? "text-right" : undefined}>
                  {t(`columns.${c}`)}
                </TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{tCommon("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <MessageRow>
                <p>{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : rooms.length === 0 ? (
              <MessageRow>
                <DoorOpen className="size-8 text-muted-foreground/50" />
                <p>{t("empty")}</p>
              </MessageRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id} className={cn(!room.isActive && "text-muted-foreground")}>
                  <TableCell className="font-medium">{room.number}</TableCell>
                  <TableCell>{room.building ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{format.number(room.capacity)}</TableCell>
                  <TableCell>{room.isActive ? t("active") : t("inactive")}</TableCell>
                  <TableCell>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={tCommon("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(room)}>
                            <Pencil /> {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggle(room)}>
                            <Power /> {room.isActive ? t("deactivate") : t("activate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(room)}>
                            <Trash2 /> {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoomFormDialog open={editing !== null} room={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      <RoomsBulkDialog open={bulk} onClose={() => setBulk(false)} />
      <DeleteRoomDialog room={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">{children}</div>
      </TableCell>
    </TableRow>
  );
}

function DeleteRoomDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const t = useTranslations("school.exams.seating.rooms.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteRoom();
  const confirm = () => {
    if (!room) return;
    remove.mutate(room.id, {
      onSuccess: () => {
        toast.success(t("done", { number: room.number }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };
  return (
    <AlertDialog open={!!room} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { number: room?.number ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
