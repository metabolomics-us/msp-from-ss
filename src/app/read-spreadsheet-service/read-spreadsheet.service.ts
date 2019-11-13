import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class ReadSpreadsheetService {

	// Return observable where excel file is converted into 2x2 array that can be used by the subscriber
	readXlsx(sheetData: FileList): Observable<any> {

		return new Observable(subscriber => {
			const reader = new FileReader();
			// Create callback function for when the excel file has been loaded by the FileReader()
			reader.addEventListener('load', (loadEvent) => {
				// <FileReader> - explicit type declaration so that Angular won't throw an error
                const target: FileReader = loadEvent.target as FileReader;
                const wb = XLSX.read(target.result, { type: 'binary' });
                // Gets error: Namespace '"xlsx"' has no exported member 'WorkBook
                // const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
                
                // Make sure the length of the array is appropriate
                //  This accounts for an error with spreadsheets made in LibreOffice; whereby if you manually delete rows 
                //  from your spreadsheet, XLSX reads the spreadsheet as being over 1 million lines long 
                let msmsArray: any[][];
                const range = XLSX.utils.decode_range(wb.Sheets[wb.SheetNames[0]]['!ref']);
                const numRows = range.e.r;

                if (numRows < 10000) {
                    // Convert spreadsheet data to JSON data
                    //  Using {header:1} will generate a 2x2 array
                    msmsArray = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});
                    subscriber.next(msmsArray);
                } else {
                    subscriber.error(`Error: file may be corrupted or too large; 
                    Try using another spreadsheet reader or converting file to another format`);
                }
            });
            reader.addEventListener('error', () => {
                subscriber.error('Error: file may be corrupted or may not exist');
            });
			// Read the excel file and execute callback function from addEventListener
			reader.readAsBinaryString(sheetData[0]);
		});

	} // end readXlsx

}
