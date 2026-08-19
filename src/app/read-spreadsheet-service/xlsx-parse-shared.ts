import * as XLSX from 'xlsx';

// A manually-row-deleted spreadsheet (e.g. LibreOffice) can make SheetJS report the sheet's
// dimension as spanning far more rows than it actually has, rather than shrinking it. This
// threshold guards against treating such a file as a legitimately huge spreadsheet.
export const MAX_ROWS = 10000;

export class SpreadsheetTooLargeError extends Error {}

// Shared by xlsx-parse.worker.ts and read-spreadsheet.service.ts's main-thread fallback --
// both call XLSX.read() themselves (with a different `type` option for their own input
// format) and pass the resulting workbook here for everything after that.
export function parseFirstSheetRows(wb: XLSX.WorkBook): string[][] {
	// An empty sheet has no '!ref' range; fall back to a single-cell range so
	// decode_range still returns a valid (empty) range instead of throwing.
	const sheetRef = wb.Sheets[wb.SheetNames[0]]['!ref'] ?? 'A1';
	const range = XLSX.utils.decode_range(sheetRef);

	if (range.e.r >= MAX_ROWS) {
		throw new SpreadsheetTooLargeError(`Error: file may be corrupted or too large;
                    Try using another spreadsheet reader or converting file to another format`);
	}

	return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
}
