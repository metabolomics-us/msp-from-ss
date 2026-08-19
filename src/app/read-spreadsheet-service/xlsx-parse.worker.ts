/// <reference lib="webworker" />

import * as XLSX from 'xlsx';
import { parseFirstSheetRows, SpreadsheetTooLargeError } from './xlsx-parse-shared';

addEventListener('message', ({ data }: { data: ArrayBuffer }) => {
	try {
		const wb: XLSX.WorkBook = XLSX.read(data, { type: 'array' });
		postMessage({ result: parseFirstSheetRows(wb) });
	} catch (e) {
		if (e instanceof SpreadsheetTooLargeError) {
			postMessage({ error: e.message });
		} else {
			postMessage({ error: 'Error: file may be corrupted or may not exist' });
		}
	}
});
