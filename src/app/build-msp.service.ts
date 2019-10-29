import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';

import { _ } from 'underscore';

@Injectable({
	providedIn: 'root'
})
export class BuildMspService {

    errorWarning: string;
    errorText: string;
    vitalHeaders: string[];

	constructor() {
		// Moving this here b/c Services can't use oninit
        // this.errorWarning = '';
        this.resetErrors();
		this.vitalHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
    }
    

    resetErrors() {
        this.errorWarning = '';
        this.errorText = '';
    }


	// Writes file for user download
	//  This method was included so that I could create a spy for it during unit tests
	//  In other words, I didn't want to actually produce a file during every test
	saveFile(stringToWrite: string, name: string) {
        // Turn string into Blob object so that it can be written into a file
        const blob = new Blob([stringToWrite], {type: 'text/plain;charset=utf-8'});
		saveAs(blob, name);
    }
    













    // Create a string from a 2x2 array of MS/MS data
	buildMspStringFromArray(dataArray: any[]): string {

        let dataMissing = '';

		// Initialize string to be returned
        let mspString = '';
        // Initialize string for one metabolite
        let metaboliteString = '';
		// A list of mass and intensity for each peak
        let spectrum: string[];

        let hasErrors = false;

		// Traverse each row of dataArray and build mspString
		//  Each row represents data for one metabolite
		dataArray.forEach((element: any) => {

            metaboliteString +=
            'Name: ' + element['METABOLITE NAME'] + '\n' +
            'InChIKey: ' + element['INCHIKEY'] + '\n' +
            'Precursor Type: ' + element['ADDUCT TYPE'] + '\n' +
            'Precursor Mz: ' + element['AVERAGE MZ'] + '\n' +
            'Retention Time: ' + element['AVERAGE RT(MIN)'] + '\n' +
            'Formula: ' + element['FORMULA'] + '\n';
            // Create array of mass/intensity peaks to be written into the string line by line
            //  First check that MS/MS spectrum data exists
            if (element['MS/MS SPECTRUM'].length > 0) {
                spectrum = element['MS/MS SPECTRUM'].split(' ');
                metaboliteString += 'Num Peaks: ' + spectrum.length.toString() + '\n';
                spectrum.forEach(massIntensity => {
                    metaboliteString += massIntensity.replace(':', ' ') + '\n';
                });
            } else {
                metaboliteString += 'Num Peaks: ';
            }
            metaboliteString += '\n\n';

            mspString += metaboliteString;
            metaboliteString = '';
        });
        if (hasErrors) {
            this.errorWarning = 'Data may have one or more errors';
        }
		return mspString;
    } // end buildMspStringFromArray
















	// // Create a string from a 2x2 array of MS/MS data
	// buildMspStringFromArray(dataArray: any[]): string {

    //     let dataMissing = '';

	// 	// Initialize string to be returned
    //     let mspString = '';
    //     // Initialize string for one metabolite
    //     let metaboliteString = '';
	// 	// A list of mass and intensity for each peak
    //     let spectrum: string[];

    //     let hasErrors = false;

	// 	// Traverse each row of dataArray and build mspString
	// 	//  Each row represents data for one metabolite
	// 	dataArray.forEach((element: any) => {

	// 		try {
	// 			mspString +=
	// 			'Name: ' + element['METABOLITE NAME'] + '\n' +
	// 			'InChIKey: ' + element['INCHIKEY'] + '\n' +
	// 			'Precursor Type: ' + element['ADDUCT TYPE'] + '\n' +
	// 			'Precursor Mz: ' + element['AVERAGE MZ'] + '\n' +
	// 			'Retention Time: ' + element['AVERAGE RT(MIN)'] + '\n' +
	// 			'Formula: ' + element['FORMULA'] + '\n';
	// 			// Create array of mass/intensity peaks to be written into the string line by line
	// 			//  First check that MS/MS spectrum data exists
	// 			if (element['MS/MS SPECTRUM'].length > 0) {
	// 				spectrum = element['MS/MS SPECTRUM'].split(' ');
	// 				mspString += 'Num Peaks: ' + spectrum.length.toString() + '\n';
	// 				spectrum.forEach(massIntensity => {
	// 					mspString += massIntensity.replace(':', ' ') + '\n';
	// 				});
	// 			} else {
    //                 mspString += 'Num Peaks: ';
    //             }
	// 			mspString = mspString + '\n\n';
	// 		} catch (err) {
	// 			hasErrors = true;

	// 			// handleMspStringErrors ???
	// 			// Maybe build string for download of rows w/errors
	// 			// Maybe check for which ones are equal to ''
	// 			// Maybe a scrollable text window with all of the lines w/missing data?
	// 		}
    //     });
    //     if (hasErrors) {
    //         this.errorWarning = 'Data may have one or more errors';
    //     }
	// 	return mspString;
    // } // end buildMspStringFromArray


    removeAttributes(jsonArray: any[]): any[] {
        const self = this;
        return _.map(jsonArray, function(entry: any) { return _.pick(entry, ...self.vitalHeaders); });
    }
    

    // Remove duplicate entries in the JSON array based on avg retention time and avg m/z
    removeDuplicates(jsonArray: any[]): any[] {

        // Turn each entry into a string for easy comparison
        let stringsArray = jsonArray.map(x => JSON.stringify(x));
        stringsArray = this.processText(stringsArray);

        // Create new JSON array and push only one entry for each name
        let cleanedArray = [];
        for (let i = 0; i < stringsArray.length; i++) {
            if (stringsArray.indexOf(stringsArray[i]) === i) {
                cleanedArray.push(jsonArray[i]);
            }
        }
        return cleanedArray;
    } // end removeDuplicates


	// Builds array of dictionaries
	buildJsonArray(headers: string[], data: string[][]): any[] {
		// Iterate through data and build dictionary
		// keys=headers[], values=row of data[][]

		let i: number, j: number;
		let dict: any = {};
		const arr: any = [];
		for (i = 0; i < data.length; i++) {
			dict = {};
			for (j = 0; j < headers.length; j++) {
				// Make sure data exists for a given header
				if (data[i][j]) {
					dict[headers[j]] = data[i][j];
				} else {
					dict[headers[j]] = '';
				}
			}
			// Add dictionary to the array
			arr.push(dict);
		}
		return arr;
	} // end buildJsonArray


	// Check for any column headers that are misspelled or missing
	hasHeaderErrors(headers: any[]): boolean {

		let hasError = false;
		// let headerErrors: string = 'These headers may be misspelled or missing:';
		const headerErrors: string[] = [];

		this.vitalHeaders.forEach(headerName => {
			// If a vital header doesn't appear in the headers row, indexOf returns -1
			if (headers.indexOf(headerName) < 0) {
				hasError = true;
				// headerErrors += ' ' + headerName;
				headerErrors.push(headerName);
			}
		});
		if (hasError) {
			// this.errorWarning = headerErrors;
			this.errorWarning = 'These headers may be misspelled or missing: ' + headerErrors.join(', ');
		}
		return hasError;
	} // end hasHeaderErrors


	// Text values in an array become uppercase and remove extraneous whitespace
	processText(headers: any[]): any[] {
		return headers.map(x => String(x).trim().toUpperCase());
	}


	// Check array for column headers
	lineHasHeaders(line: any[]): boolean {

		// Format the row from the MS/MS spreadsheet to be similar to be uppercase strings, like vitalHeaders
		//  i.e. all uppercase strings
		const formattedHeaders = this.processText(line);

		// Check if the line contains one of the columns and return true; false otherwise
		let i: number;
		for (i = 0; i < this.vitalHeaders.length; i ++) {
			// if (formattedHeaders.includes(this.vitalHeaders[i])) {
			if (formattedHeaders.indexOf(this.vitalHeaders[i]) >= 0) {
				return true;
			}
		}
		return false;
	} // end lineHasHeaders


	// Some MS/MS data spreadsheets do not have their headers as the first row
	//  Get the line in the MS data spreadsheet that contains the headers
	getHeaderPosition(lines: string[][]): number {

		// Iterate through the lines of data for row of headers
		for (let i = 0; i < lines.length; i++) {
			if (this.lineHasHeaders(lines[i])) {
				return i;
			}
		}
		// The headers don't exist or are all incorrectly labeled
		return -1;
	}

    // Create .msp file from a 2x2 array of data
	buildMspFile(msmsArray: string[][], fileName: string): string[] {
	// buildMspFile(msmsArray: string[][], fileName: string): string {

		// Reset the error text
        this.resetErrors();

		// Get the row number where the headers are located
		const headerPosition = this.getHeaderPosition(msmsArray);
		if (headerPosition >= 0) {

			// Get the headers, convert them to upper case and remove trailing white space
			let headers = msmsArray[headerPosition];
			headers = this.processText(headers);

			// If all important headers are available and without errors, proceed
			if (!this.hasHeaderErrors(headers)) {

				const data = msmsArray.slice(headerPosition + 1, msmsArray.length);
				// Create an array of dictionaries
                let msmsJsonArray = this.buildJsonArray(headers, data);

                // remove unneeded attributes
                msmsJsonArray = this.removeAttributes(msmsJsonArray);

                // Use header position to get row number; check for missing data per each header
                // alertMissingData 

                // Get length of array
                const msmsLength = msmsJsonArray.length;
                // Remove duplicate entries
                msmsJsonArray = this.removeDuplicates(msmsJsonArray);
                // Tell the user if duplicate entries were not included
                if (msmsJsonArray.length < msmsLength) {
                    this.errorWarning = 'Duplicate entries found but not included in .msp';
                }

				// Turn array into a string
				const mspString = this.buildMspStringFromArray(msmsJsonArray);
				// User will be prompted to save a .msp for their data
                this.saveFile(mspString, fileName.split('.')[0] + '.msp');
			} else {
                this.errorWarning = 'Check column headers; one may be missing or misspelled';
            }
		} else {
            this.errorWarning = 'Check column headers; one may be missing or misspelled';
        }
        // return this.errorWarning;

        return [this.errorWarning, this.errorText];
	}
}
