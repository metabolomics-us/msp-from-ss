import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import { _ } from 'underscore';

@Injectable({
	providedIn: 'root'
})
export class BuildMspService {

    errorWarning: string;
    missingData: number[];
    duplicates: number[];    
    vitalHeaders: string[];

	constructor() {
		// Moving this here b/c Services can't use oninit
        this.resetErrors();
		this.vitalHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
    }
    

    resetErrors() {
        this.missingData = [];
        this.duplicates = [];
        this.errorWarning = '';
    }


    saveErrorFile(name: string) {
        let missingDataText = 'These lines contain missing data:\n';
        let duplicatesText = 'These lines are duplicates:\n';
        if (this.missingData.length > 0) {
            missingDataText += this.missingData.map(x => String(x)).join(', ');
        }
        if (this.duplicates.length > 0) {
            duplicatesText += this.duplicates.map(x => String(x)).join(', ');
        }
        this.saveFile([missingDataText, duplicatesText].join('\n\n'), name);
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
		// A list of mass and intensity for each peak
        let spectrum: string[];

		// Traverse each row of dataArray and build mspString
		//  Each row represents data for one metabolite
		dataArray.forEach((element: any) => {

            mspString +=
            'Name: ' + (element['METABOLITE NAME'] || '') + '\n' +
            'InChIKey: ' + (element['INCHIKEY'] || '') + '\n' +
            'Precursor Type: ' + (element['ADDUCT TYPE'] || '') + '\n' +
            'Precursor Mz: ' + (element['AVERAGE MZ'] || '') + '\n' +
            'Retention Time: ' + (element['AVERAGE RT(MIN)'] || '') + '\n' +
            'Formula: ' + (element['FORMULA'] || '') + '\n';
            // Create array of mass/intensity peaks to be written into the string line by line
            //  First check that MS/MS spectrum data exists
            if (element['MS/MS SPECTRUM'] && element['MS/MS SPECTRUM'].length > 0) {
                spectrum = element['MS/MS SPECTRUM'].split(' ');
                mspString += 'Num Peaks: ' + spectrum.length.toString() + '\n';
                spectrum.forEach(massIntensity => {
                    mspString += massIntensity.replace(':', ' ') + '\n';
                });
            } else {
                mspString += 'Num Peaks: ';
            }
            mspString += '\n\n';
        });
		return mspString;
    } // end buildMspStringFromArray


    // Record all lines with missing data
    collectMissingData(jsonArray: any[], correctionFactor: number) {
        for (let i = 0; i < jsonArray.length; i++) {
            const vhLen = this.vitalHeaders.length;
            if (Object.keys(jsonArray[i]).length != vhLen) {
                this.missingData.push(i + correctionFactor);
            }
        }
    }


    // Remove unneeded attributes so that only the 'vital headers' remain
    removeAttributes(jsonArray: any[]): any[] {
        const self = this;
        return _.map(jsonArray, function(entry: any) { return _.pick(entry, ...self.vitalHeaders); });
    }
    

    // Remove duplicate entries in the JSON array based on avg retention time and avg m/z
    removeDuplicates(jsonArray: any[], correctionFactor: number): any[] {

        // Turn each entry into a string for easy comparison
        let stringsArray = jsonArray.map(x => JSON.stringify(x));
        stringsArray = this.processText(stringsArray);

        // Create new JSON array and push only one entry for each name
        let cleanedArray = [];
        for (let i = 0; i < stringsArray.length; i++) {
            if (stringsArray.indexOf(stringsArray[i]) === i) {
                cleanedArray.push(jsonArray[i]);
            } else {
                this.duplicates.push(i + correctionFactor);
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
                if (data[i][j]) {
					dict[headers[j]] = data[i][j];
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
			this.errorWarning = 'These headers may be misspelled or missing: ' + headerErrors.join(', ');
		}
		return hasError;
	} // end hasHeaderErrors


	// Remove extraneous whitespace and convert all values to uppercase in an array
	processText(headers: any[]): any[] {
		return headers.map(x => String(x).trim().toUpperCase());
	}


	// Check if array has the vital headers
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
	buildMspFile(msmsArray: string[][], fileName: string): string {
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
                this.collectMissingData(msmsJsonArray, headerPosition + 2);
                if (this.missingData.length > 0) {
                    this.errorWarning = 'Warning: Some entries have missing data; these attributes were left blank';
                }

                // Get length of array
                const msmsLength = msmsJsonArray.length;
                // Remove duplicate entries
                msmsJsonArray = this.removeDuplicates(msmsJsonArray, headerPosition + 2);
                // Tell the user if duplicate entries were not included
                if (this.duplicates.length > 0) {
                    if (this.errorWarning.length > 0) {
                        this.errorWarning += '<br>';
                    } 
                    this.errorWarning += 'Warning: duplicate entries found but not included in .msp';
                }

				// Turn array into a string
				const mspString = this.buildMspStringFromArray(msmsJsonArray);
				// User will be prompted to save a .msp for their data
                this.saveFile(mspString, fileName.split('.')[0] + '.msp');
			}
		} else {
            this.errorWarning = 'Error: column headers not found';
        }
        return this.errorWarning;
	}
}
