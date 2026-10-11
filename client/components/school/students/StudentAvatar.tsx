"use client";

import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** A student's photo as a small circle, or a placeholder. */
export function StudentAvatar({ photo, className }: { photo: string | null; className?: string }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted", className)}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className="size-1/2 text-muted-foreground" />
      )}
    </span>
  );
}
