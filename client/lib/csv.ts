// A CSV file the visitor saves. Starts with a byte-order mark so Excel reads Bangla as UTF-8.
type Cell = string | number | null | undefined;

const quote = (cell: Cell) => {
  let text = cell == null ? "" : String(cell);
  // text starting like a formula (=, +, -, @, tab, return) would run in Excel: a leading ' keeps it text
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function downloadCsv(fileName: string, rows: Cell[][]) {
  const csv = "﻿" + rows.map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
