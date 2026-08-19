/// <reference lib="webworker" />

import * as XLSX from 'xlsx';

addEventListener('message', ({ data }: { data: ArrayBuffer }) => {
	try {
		const wb: XLSX.WorkBook = XLSX.read(data, { type: 'array' });
		// An empty sheet has no '!ref' range; fall back to a single-cell range so
		// decode_range still returns a valid (empty) range instead of throwing.
		const sheetRef = wb.Sheets[wb.SheetNames[0]]['!ref'] ?? 'A1';
		const range = XLSX.utils.decode_range(sheetRef);
		const numRows = range.e.r;

		if (numRows < 10000) {
			const msmsArray: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
			postMessage({ result: msmsArray });
		} else {
			postMessage({ error: `Error: file may be corrupted or too large;
                    Try using another spreadsheet reader or converting file to another format` });
		}
	} catch {
		postMessage({ error: 'Error: file may be corrupted or may not exist' });
	}
});
