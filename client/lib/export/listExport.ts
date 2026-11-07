// A list to save as Excel or print as PDF: the same title, columns and rows for both.

export type ExportCell = string | number | null | undefined;

export type ExportColumn = {
  header: string;
  // the column's width in Excel, in characters (left out: worked out from the text)
  width?: number;
  // numbers and amounts sit on the right
  align?: "left" | "right";
};

export type ListExport = {
  // the file's name without its extension, e.g. "students-2026-11-07"
  fileName: string;
  // the school's name, then the list's title, then a line under it (date, count, filters)
  school: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
};

/** "students-2026-11-07": a file name with today's date (Bangladesh). */
export const datedFileName = (base: string) =>
  `${base}-${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date())}`;
