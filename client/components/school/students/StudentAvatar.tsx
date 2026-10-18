"use client";

import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** First letters of the first and last word: "Rahim Uddin" -> "RU". */
const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toUpperCase();
};

/** A student's photo as a small circle, or their initials (given a name), or a placeholder. */
export function StudentAvatar({ photo, name, className }: { photo: string | null; name?: string; className?: string }) {
  const letters = name ? initials(name) : "";
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-soft text-navy ring-1 ring-navy/10",
        className,
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
        <img src={photo} alt="" className="size-full object-cover" />
      ) : letters ? (
        <span className="text-[13px] font-semibold tracking-wide">{letters}</span>
      ) : (
        <UserRound className="size-1/2 opacity-70" />
      )}
    </span>
  );
}
