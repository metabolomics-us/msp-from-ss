import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Injectable({
	providedIn: 'root'
})
export class ReadSpreadsheetService {

	errorText: string;

	constructor() {
		// Moving this here b/c Services can't use oninit
		this.errorText = '';
	}

	// Create a string from a 2x2 array of MS/MS data
	buildMspStringFromArray(dataArray: any): string {

		// Initialize string to be returned
		let mspString = '';

		// A list of mass and intensity for each peak
		let spectrum: string[];

		// Traverse each row of dataArray and build mspString
		//  Each row represents data for one metabolite
		dataArray.forEach((element: any) => {
			try {
				mspString +=
				'Name: ' + element['Metabolite name'] + '\n' +
				'InChIKey: ' + element.INCHIKEY + '\n' +
				'Precursor Type: ' + element['Adduct type'] + '\n' +
				'Precursor Mz: ' + element['Average Mz'] + '\n' +
				'Retention Time: ' + element['Average Rt(min)'] + '\n' +
				'Formula: ' + element.Formula + '\n';
				// Create array of mass/intensity peaks to be written into the string line by line
				spectrum = element['MS/MS spectrum'].split(' ');
				mspString += 'Num Peaks: ' + spectrum.length.toString() + '\n';
				spectrum.forEach(massIntensity => {
					mspString += massIntensity.replace(':', ' ') + '\n';
				});
				mspString = mspString + '\n\n';
			} catch (err) {
				// error
			}
		});
		return mspString;
	} // end buildMspStringFromArray


	// Builds array of dictionaries
	buildDictArray(headers: string[], data: string[][]): any[] {
		// Iterate through data and build dictionary
        // keys=headers[], values=row of data[][]

		let i: number, j: number;
		let dict: any = {};
		const arr: any = [];
		let dataError = false;
		for (i = 0; i < data.length; i++) {
			dict = {};
			for (j = 0; j < headers.length; j++) {

				// Make sure data exists for a given header
				if (data[i][j]) {
					dict[headers[j]] = data[i][j];
				} else {
					dataError = true;
                    dict[headers[j]] = '';
				}
			}
			// Add dictionary to the array
			arr.push(dict);
		}
		if (dataError) { this.errorText += '<p>One or more rows may be missing data</p>'; }
		return arr;
	} // end buildDictArray


	// Check array for column headers
	validateHeaders(line: any[]): boolean {

		// List of necessary columns as uppercase strings
		const cols = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
		// Format the line of data from the MS/MS spreadsheet to be similar to that of cols
		//  i.e. all uppercase strings
		const formattedLine = line.map(x => String(x).toUpperCase());

		// Check if the line contains all necessary columns; return false if a column is missing
		let i: number;
		for (i = 0; i < cols.length; i ++) {
			if (!formattedLine.includes(cols[i])) {
				return false;
			}
		}
		return true;
	} // end validateHeaders


	// Some MS/MS data spreadsheets do not have their headers as the first row
	//  Get the line in the MS data spreadsheet that contains the headers
	getHeaderPosition(lines: string[][]): number {

		// Iterate through the lines of data for row of headers
		for (let i = 0; i < lines.length; i++) {
			if (this.validateHeaders(lines[i])) {
				return i;
			}
		}
		// The headers are incorrectly labeled
		return -1;
	}


	// Create .msp file from a 2x2 array of data
	buildMspFile(msmsArray: string[][], fileName: string) {

		// Get the row number where the headers are located
		const headerPosition = this.getHeaderPosition(msmsArray);
		// If the data contains a row of headers
		if (headerPosition >= 0) {

			// Split the array into headers and data
            const headers = msmsArray[headerPosition];

			const data = msmsArray.slice(headerPosition + 1, msmsArray.length);

			// Create an array of dictionaries
			const msmsDictArray = this.buildDictArray(headers, data);
			// Turn array into a string
			const mspString = this.buildMspStringFromArray(msmsDictArray);
			// Turn string into Blob object so that it can be written into a file
			const blob = new Blob([mspString], {type: 'text/plain;charset=utf-8'});
			// User will be prompted to save a .msp for their data
			saveAs(blob, fileName.split('.')[0] + '.msp');

			document.getElementById('errorText').innerHTML = this.errorText;

		} else {
			document.getElementById('errorText').innerHTML = '<p>Check column headers; one may be missing or misspelled<p>';
		}
	}


	// Create .msp text file from a .csv file
	mspFromCsv(sheetData: FileList) {

		const reader = new FileReader();

		// Create callback function for when the excel file has been loaded by the FileReader()
		reader.addEventListener('load', (loadEvent) => {
			// Turn the spreadsheet data into a string
			// <FileReader> - explicit type declaration so that Angular won't throw an error
			const target: FileReader = loadEvent.target as FileReader;
			let msmsText: string = target.result as string;
			msmsText = msmsText.trim();

			// Turn the string of data into a 2x2 array
			const msmsArray: string[][] = msmsText.split('\n').map(line => line.split(','));

			const sheetName = sheetData[0].name;
			// Create .msp file
			this.buildMspFile(msmsArray, sheetName);
		});

		if (sheetData[0]) {
			// Read the excel file and execute callback function from addEventListener
			reader.readAsText(sheetData[0]);
		} else {
			document.getElementById('errorText').innerHTML = 'Choose valid excel or .csv file';
		}

	} // end mspFromCsv


	// Create .msp text file from an excel file
	mspFromXlsx(sheetData: FileList) {

		const reader = new FileReader();

		// Create callback function for when the excel file has been loaded by the FileReader()
		reader.addEventListener('load', (loadEvent) => {
			// <FileReader> - explicit type declaration so that Angular won't throw an error
			const target: FileReader = loadEvent.target as FileReader;
			const wb: XLSX.WorkBook = XLSX.read(target.result, { type: 'binary' });

			// Convert spreadsheet data to JSON data
			// Using {header:1} will generate a 2x2 array
            const msmsArray: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});

			const sheetName = sheetData[0].name;
			// Create .msp file
			this.buildMspFile(msmsArray, sheetName);
		});

		if (sheetData[0]) {
			// Read the excel file and execute callback function from addEventListener
			reader.readAsBinaryString(sheetData[0]);
		} else {
			document.getElementById('errorText').innerHTML = 'Choose valid excel or .csv file';
		}

	} // end mspFromXlsx

}
