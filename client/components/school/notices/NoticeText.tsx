import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * A notice's text. It is plain text with a few marks, turned into elements here (never
 * into HTML, so nothing written in a notice can run as code):
 *   a blank line between paragraphs, **bold**, a line starting with "- " is a list item,
 *   and web links are clickable.
 */

const INLINE = /(\*\*[^*\n]+\*\*|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

const inline = (text: string): ReactNode[] =>
  text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part))
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline underline-offset-2">
          {part}
        </a>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });

const lines = (text: string) =>
  text.split("\n").map((line, i, all) => (
    <Fragment key={i}>
      {inline(line)}
      {i < all.length - 1 && <br />}
    </Fragment>
  ));

const isItem = (line: string) => /^\s*[-•]\s+/.test(line);

/* Paragraphs split at blank lines; inside one, each run of "- " lines is a list. */
const toBlocks = (body: string) => {
  const blocks: { list: boolean; rows: string[] }[] = [];
  for (const chunk of body.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/)) {
    let current: { list: boolean; rows: string[] } | null = null;
    for (const row of chunk.split("\n")) {
      const list = isItem(row);
      const text = list ? row.replace(/^\s*[-•]\s+/, "") : row;
      if (current && current.list === list) current.rows.push(text);
      else blocks.push((current = { list, rows: [text] }));
    }
  }
  return blocks;
};

export function NoticeText({ body, className }: { body: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed break-words", className)}>
      {toBlocks(body).map((block, i) =>
        block.list ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.rows.map((row, j) => (
              <li key={j}>{inline(row)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{lines(block.rows.join("\n"))}</p>
        ),
      )}
    </div>
  );
}

/** The text without its marks, for a one-line preview. */
export const noticeSnippet = (body: string, length = 160) => {
  const flat = body.replace(/\*\*/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length).trimEnd()}…` : flat;
};
