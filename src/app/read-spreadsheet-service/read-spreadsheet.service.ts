import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class ReadSpreadsheetService {

	// Return observable where excel file is converted into 2x2 array that can be used by the subscriber
	//  Same array shape as readAlignmentResultTxt() produces, so the rest of the pipeline is shared
	readXlsx(sheetData: FileList): Observable<string[][]> {
		if (typeof Worker !== 'undefined') {
			return this.readXlsxViaWorker(sheetData);
		}
		// Fallback for environments without Web Worker support (e.g. the Vitest/jsdom test
		//  environment): parse synchronously on the main thread, same as before.
		return this.readXlsxSync(sheetData);
	} // end readXlsx

	private readXlsxViaWorker(sheetData: FileList): Observable<string[][]> {
		return new Observable<string[][]>(subscriber => {
			const worker = new Worker(new URL('./xlsx-parse.worker', import.meta.url));

			worker.addEventListener('message', ({ data }: { data: { result: string[][] } | { error: string } }) => {
				if ('error' in data) {
					subscriber.error(data.error);
				} else {
					subscriber.next(data.result);
					subscriber.complete();
				}
				worker.terminate();
			});
			worker.addEventListener('error', () => {
				subscriber.error('Error: file may be corrupted or may not exist');
				worker.terminate();
			});

			sheetData[0].arrayBuffer()
				.then(buffer => worker.postMessage(buffer, [buffer]))
				.catch(() => {
					subscriber.error('Error: file may be corrupted or may not exist');
					worker.terminate();
				});

			return () => worker.terminate();
		});
	}

	private readXlsxSync(sheetData: FileList): Observable<string[][]> {
		return new Observable<string[][]>(subscriber => {
			const reader = new FileReader();
			const onLoad = (loadEvent: ProgressEvent<FileReader>) => {
				const target = loadEvent.target as FileReader;
				const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });

				// Make sure the length of the array is appropriate
				//  This accounts for an error with spreadsheets made in LibreOffice; whereby if you manually delete rows
				//  from your spreadsheet, XLSX reads the spreadsheet as being over 1 million lines long
				let msmsArray: string[][];
				// An empty sheet has no '!ref' range; fall back to a single-cell range so
				// decode_range still returns a valid (empty) range instead of throwing.
				const sheetRef = wb.Sheets[wb.SheetNames[0]]['!ref'] ?? 'A1';
				const range = XLSX.utils.decode_range(sheetRef);
				const numRows = range.e.r;

				if (numRows < 10000) {
					// Convert spreadsheet data to JSON data
					//  Using {header:1} will generate a 2x2 array
					msmsArray = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
					subscriber.next(msmsArray);
					subscriber.complete();
				} else {
					subscriber.error(`Error: file may be corrupted or too large;
                    Try using another spreadsheet reader or converting file to another format`);
				}
			};
			const onError = () => subscriber.error('Error: file may be corrupted or may not exist');

			reader.addEventListener('load', onLoad);
			reader.addEventListener('error', onError);
			reader.readAsBinaryString(sheetData[0]);

			return () => {
				reader.removeEventListener('load', onLoad);
				reader.removeEventListener('error', onError);
			};
		});
	}

	// Return observable where a MS-DIAL AlignmentResult .txt file is converted into a 2x2 array
	//  Same array shape as readXlsx() produces, so the rest of the pipeline is shared
	readAlignmentResultTxt(sheetData: FileList): Observable<string[][]> {
		return new Observable<string[][]>(subscriber => {
			const reader = new FileReader();
			const onLoad = (loadEvent: ProgressEvent<FileReader>) => {
				const target = loadEvent.target as FileReader;
				const text = (target.result as string).replace(/\r\n/g, '\n');
				const msmsArray = text.split('\n')
					.filter(line => line.trim().length > 0)
					.map(line => line.split('\t'));
				subscriber.next(msmsArray);
				subscriber.complete();
			};
			const onError = () => subscriber.error('Error: file may be corrupted or may not exist');

			reader.addEventListener('load', onLoad);
			reader.addEventListener('error', onError);
			reader.readAsText(sheetData[0]);

			return () => {
				reader.removeEventListener('load', onLoad);
				reader.removeEventListener('error', onError);
			};
		});
	} // end readAlignmentResultTxt

}
