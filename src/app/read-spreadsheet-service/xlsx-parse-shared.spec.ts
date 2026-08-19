import * as XLSX from 'xlsx';
import { parseFirstSheetRows, SpreadsheetTooLargeError, MAX_ROWS } from './xlsx-parse-shared';

describe('parseFirstSheetRows', () => {

	it('should convert a workbook\'s first sheet into a 2x2 array of strings', () => {
		const sheet = XLSX.utils.aoa_to_sheet([
			['Alignment ID', 'Metabolite name'],
			['1', '1-Methyltryptophan']
		]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');

		expect(parseFirstSheetRows(wb)).toEqual([
			['Alignment ID', 'Metabolite name'],
			['1', '1-Methyltryptophan']
		]);
	});

	it('should treat a sheet with no !ref as empty rather than throwing', () => {
		const sheet = XLSX.utils.aoa_to_sheet([['Alignment ID']]);
		delete sheet['!ref'];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');

		expect(parseFirstSheetRows(wb)).toEqual([]);
	});

	it('should throw SpreadsheetTooLargeError when the sheet spans at least MAX_ROWS rows', () => {
		const sheet = XLSX.utils.aoa_to_sheet([['Alignment ID']]);
		sheet['!ref'] = `A1:A${MAX_ROWS + 1}`;
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');

		expect(() => parseFirstSheetRows(wb)).toThrow(SpreadsheetTooLargeError);
	});

	it('should not throw when the sheet spans exactly one row under MAX_ROWS', () => {
		const sheet = XLSX.utils.aoa_to_sheet([['Alignment ID']]);
		sheet['!ref'] = `A1:A${MAX_ROWS - 1}`;
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');

		expect(() => parseFirstSheetRows(wb)).not.toThrow();
	});

});
