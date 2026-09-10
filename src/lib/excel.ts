import * as XLSX from "xlsx";

/** Download a multi-sheet Excel workbook (.xlsx). Empty sheets still get headers when provided. */
export function downloadXlsx(
  filename: string,
  sheets: Array<{
    name: string;
    rows: Record<string, unknown>[];
    /** Used when rows is empty so the sheet still has column headers. */
    headers?: string[];
  }>
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    let ws: XLSX.WorkSheet;
    if (sheet.rows.length) {
      ws = XLSX.utils.json_to_sheet(sheet.rows);
    } else if (sheet.headers?.length) {
      ws = XLSX.utils.aoa_to_sheet([sheet.headers]);
    } else {
      ws = XLSX.utils.aoa_to_sheet([[]]);
    }
    const safeName = sheet.name.replace(/[\\/?*[\]]/g, "").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
