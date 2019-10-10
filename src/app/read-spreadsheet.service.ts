import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class ReadSpreadsheetService {

    // Return observable where .csv file is converted into 2x2 array that can be used by the subscriber
	readCsv(sheetData: FileList): Observable<any> {

        return new Observable(subscriber => {
            const reader = new FileReader();
            reader.addEventListener('load', (loadEvent) => {
                // Turn the spreadsheet data into a string
                // <FileReader> - explicit type declaration so that Angular won't throw an error
                const target: FileReader = loadEvent.target as FileReader;
                let msmsText: string = target.result as string;
                msmsText = msmsText.trim();
                // Turn the string of data into a 2x2 array
                const msmsArray: string[][] = msmsText.split('\n').map(line => line.split(','));
                subscriber.next(msmsArray);
            });
            // Read the csv file and execute callback function from addEventListener
            reader.readAsText(sheetData[0]);
        });

    } // end readCsv
    

	// Return observable where excel file is converted into 2x2 array that can be used by the subscriber
	readXlsx(sheetData: FileList): Observable<any> {

        return new Observable(subscriber => {
            const reader = new FileReader();
            // Create callback function for when the excel file has been loaded by the FileReader()
            reader.addEventListener('load', (loadEvent) => {
                // <FileReader> - explicit type declaration so that Angular won't throw an error
                const target: FileReader = loadEvent.target as FileReader;
                const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });
                // Convert spreadsheet data to JSON data
                // Using {header:1} will generate a 2x2 array
                const msmsArray: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});
                subscriber.next(msmsArray);
            });
            // Read the excel file and execute callback function from addEventListener
            reader.readAsBinaryString(sheetData[0]);
        });

    } // end readXlsx
  
}
