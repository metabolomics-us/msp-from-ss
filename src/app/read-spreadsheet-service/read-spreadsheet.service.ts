import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';
import { parseFirstSheetRows, SpreadsheetTooLargeError } from './xlsx-parse-shared';

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

				let msmsArray: string[][];
				try {
					// XLSX.read (or parseFirstSheetRows below) throws synchronously on a corrupted/
					//  unparseable file; this listener runs as a raw DOM event callback, outside the
					//  Observable executor's own try/catch scope, so without this the exception would
					//  otherwise escape as an unhandled error instead of reaching subscribers.
					const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
					msmsArray = parseFirstSheetRows(wb);
				} catch (e) {
					if (e instanceof SpreadsheetTooLargeError) {
						subscriber.error(e.message);
					} else {
						subscriber.error('Error: file may be corrupted or may not exist');
					}
					return;
				}

				subscriber.next(msmsArray);
				subscriber.complete();
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
