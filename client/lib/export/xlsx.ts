import type { ListExport } from "./listExport";

/*
 * Saves a list as an Excel workbook (.xlsx): the school's name and the list's title on top, then
 * the table with a bold, frozen header row and filters. ExcelJS is loaded only when a file is
 * made (it is large). Text is always stored as text, so a cell starting with "=" is never a formula.
 */
export async function downloadXlsx(list: ListExport) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(list.title.slice(0, 31) || "Sheet1", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const columnCount = Math.max(list.columns.length, 1);

  // the header lines, each across the table's width
  const banner = (text: string, size: number, bold: boolean) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, columnCount);
    row.getCell(1).font = { size, bold };
    row.getCell(1).alignment = { vertical: "middle" };
  };
  banner(list.school, 14, true);
  banner(list.title, 12, true);
  if (list.subtitle) banner(list.subtitle, 10, false);
  sheet.addRow([]);

  const header = sheet.addRow(list.columns.map((c) => c.header));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
  });
  header.height = 20;

  for (const values of list.rows) {
    const row = sheet.addRow(values.map((v) => (v == null ? "" : v)));
    list.columns.forEach((c, i) => {
      if (c.align === "right") row.getCell(i + 1).alignment = { horizontal: "right" };
    });
  }

  // widths: as given, else from the longest text in the column (within reason)
  list.columns.forEach((c, i) => {
    const longest = Math.max(c.header.length, ...list.rows.map((r) => String(r[i] ?? "").length));
    sheet.getColumn(i + 1).width = c.width ?? Math.min(Math.max(longest + 2, 8), 45);
  });

  // the header stays in view while scrolling, and every column can be filtered
  sheet.views = [{ state: "frozen", ySplit: header.number }];
  sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: columnCount } };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${list.fileName}.xlsx` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
