import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import { _ } from 'underscore';

export type MspSourceFormat = 'spreadsheet' | 'msdial';

@Injectable({
	providedIn: 'root'
})
export class BuildMspService {

    errorWarning: string;
    missingData: string[];
    duplicates: string[];
    possibleDuplicates: string[];
    vitalHeaders: string[];

	constructor() {
		// Moving this here b/c Services can't use oninit
        this.resetErrors();
		this.vitalHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
    }


	// Vital headers required for a given source format
	//  MS-DIAL uploads don't require MS1 SPECTRUM: it's validated but never written into the .msp output
	getRequiredHeaders(format: MspSourceFormat): string[] {
		if (format === 'msdial') {
			return this.vitalHeaders.filter(header => header !== 'MS1 SPECTRUM');
		}
		return this.vitalHeaders;
	}


	// MS-DIAL uses 'MS/MS spectrum' where this app's own headers use 'MSMS SPECTRUM'
	applyMsdialHeaderAliases(headers: string[]): string[] {
		return headers.map(header => header === 'MS/MS SPECTRUM' ? 'MSMS SPECTRUM' : header);
	}


	// A spectrum-less entry isn't useful in a spectral library, regardless of source format
	removeRowsWithoutSpectrum(jsonArray: any[]): any[] {
		return jsonArray.filter(entry => !!entry['MSMS SPECTRUM']);
	}


	// For msdial, a missing spectrum is handled by removeRowsWithoutSpectrum, not reported as missing data
	getMissingDataCheckHeaders(format: MspSourceFormat, requiredHeaders: string[]): string[] {
		if (format === 'msdial') {
			return requiredHeaders.filter(header => header !== 'MSMS SPECTRUM');
		}
		return requiredHeaders;
	}

    resetErrors() {
        this.missingData = [];
        this.duplicates = [];
        this.possibleDuplicates = [];
        this.errorWarning = '';
    }


    saveErrorFile(name: string) {
        let missingDataText = 'These lines contain missing data:\n';
        let duplicatesText = 'These lines are most likely duplicates:\n';
        let possibleDuplicatesText = 'These lines are possible duplicates based on the connectivity hash of INCHIKEY:\n';
        if (this.missingData.length > 0) {
            // missingDataText += this.missingData.map(x => String(x)).join(', ');
            missingDataText += this.missingData.join('\n');
        }
        if (this.duplicates.length > 0) {
            // Sort in order to group duplicates together
            this.duplicates.sort();
            duplicatesText += this.duplicates.join('\n');
        }
        if (this.possibleDuplicates.length > 0) {
            // Sort in order to group likely duplicates together
            this.possibleDuplicates.sort();
            possibleDuplicatesText += this.possibleDuplicates.join('\n')
        }
        this.saveFile([missingDataText, duplicatesText, possibleDuplicatesText].join('\n\n'), name);
    }


	// Writes file for user download
	//  This method was included so that I could create a spy for it during unit tests
	//  In other words, I didn't want to actually produce a file during every test
	saveFile(stringToWrite: string, name: string) {
        // Turn string into Blob object so that it can be written into a file
        const blob = new Blob([stringToWrite], {type: 'text/plain;charset=utf-8'});
		saveAs(blob, name);
    }


    // Create a string from a 2x2 array of MSMS data
	buildMspStringFromArray(dataArray: any[], mspNotes: string): string {

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
            if (mspNotes) {
                mspString += 'Comments: ' + mspNotes + '\n';
            }
            // Create array of mass/intensity peaks to be written into the string line by line
            //  First check that MSMS spectrum data exists
            if (element['MSMS SPECTRUM'] && element['MSMS SPECTRUM'].length > 0) {
                spectrum = element['MSMS SPECTRUM'].split(' ');
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
    collectMissingData(jsonArray: any[], correctionFactor: number, requiredHeaders: string[] = this.vitalHeaders) {
        let keyArray: string[];
        let missingCols: string[];
        for (let i = 0; i < jsonArray.length; i++) {
            keyArray = Object.keys(jsonArray[i]);
            missingCols = requiredHeaders.filter(header => keyArray.indexOf(header) < 0);
            if (missingCols.length > 0) {
                this.missingData.push(String(i + correctionFactor) + ': ' + missingCols.join(', '));
            }
        }
    }


    // Remove unneeded attributes so that only the required headers remain
    removeAttributes(jsonArray: any[], requiredHeaders: string[] = this.vitalHeaders): any[] {
        return _.map(jsonArray, (entry: any) => _.pick(entry, ...requiredHeaders));
    }
    
    // Remove duplicate entries in the JSON array based on avg retention time and avg m/z
    removeDuplicates(jsonArray: any[], correctionFactor: number): any[] {

        // Compare attributes that indicate duplicates may have been entered
        //  Turn entries into strings for easy comparison
        let stringsArray = jsonArray.map(x => JSON.stringify([x['AVERAGE RT(MIN)'], x['AVERAGE MZ'], x['MSMS SPECTRUM']]));
        stringsArray = this.processText(stringsArray);
        // Create array of connectivity hashes from InChiKey (i.e. first section of InChiKey)
        //  If these are the same for two entries, they may be duplicates
        let firstHashArray = jsonArray.map(x => x['INCHIKEY']);
        firstHashArray = this.processText(firstHashArray);

        // Create new JSON array and push only one entry for each name
        let cleanedArray = [];
        for (let i = 0; i < stringsArray.length; i++) {
            // Check for likely duplicates
            if (stringsArray.indexOf(stringsArray[i]) === i) {
                cleanedArray.push(jsonArray[i]);
                // Check for possible duplicates; mark them, don't remove them
                if (firstHashArray.indexOf(firstHashArray[i]) != i) {
                    this.possibleDuplicates.push(String(firstHashArray.indexOf(firstHashArray[i]) + correctionFactor) + ' & ' + String(i + correctionFactor))
                }
            } else {
                this.duplicates.push(String(stringsArray.indexOf(stringsArray[i]) + correctionFactor) + ' & ' + String(i + correctionFactor));
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
				// MS-DIAL writes the literal string "null" for missing values instead of an empty cell
				if (data[i][j] && data[i][j] !== 'null') {
					dict[headers[j]] = data[i][j];
				}
			}
			// Add dictionary to the array
			arr.push(dict);
		}
		return arr;
	} // end buildJsonArray


	// Check for any column headers that are misspelled or missing
	hasHeaderErrors(headers: any[], requiredHeaders: string[] = this.vitalHeaders): boolean {

		let hasError = false;
		const headerErrors: string[] = [];

		requiredHeaders.forEach(headerName => {
			// If a vital header doesn't appear in the headers row, indexOf returns -1
			if (headers.indexOf(headerName) < 0) {
				hasError = true;
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

		// Format the row from the MSMS spreadsheet to be similar to be uppercase strings, like vitalHeaders
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


	// Some MSMS data spreadsheets do not have their headers as the first row
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
	buildMspFile(msmsArray: string[][], fileName: string, notes: string, format: MspSourceFormat = 'spreadsheet'): string {

		// Reset the error text
        this.resetErrors();

        const requiredHeaders = this.getRequiredHeaders(format);

		// Get the row number where the headers are located
		const headerPosition = this.getHeaderPosition(msmsArray);
		if (headerPosition >= 0) {

			// Get the headers, convert them to upper case and remove trailing white space
			let headers = msmsArray[headerPosition];
			headers = this.processText(headers);
			if (format === 'msdial') {
				headers = this.applyMsdialHeaderAliases(headers);
			}

			// If all required headers are available and without errors, proceed
			if (!this.hasHeaderErrors(headers, requiredHeaders)) {

				const data = msmsArray.slice(headerPosition + 1, msmsArray.length);
				// Create an array of dictionaries
                let msmsJsonArray = this.buildJsonArray(headers, data);

                // remove unneeded attributes
                msmsJsonArray = this.removeAttributes(msmsJsonArray, requiredHeaders);

                // Use header position to get row number; check for missing data per each header
                //  (a spectrum-less row is filtered below, not reported as missing data, for msdial)
                const missingDataCheckHeaders = this.getMissingDataCheckHeaders(format, requiredHeaders);
                this.collectMissingData(msmsJsonArray, headerPosition + 2, missingDataCheckHeaders);
                if (this.missingData.length > 0) {
                    this.errorWarning = 'Warning: Some entries have missing data; these attributes were left blank';
                }

                // Drop rows with no MS/MS spectrum: not useful in a spectral library, regardless of source
                msmsJsonArray = this.removeRowsWithoutSpectrum(msmsJsonArray);

                // Remove duplicate entries
                //  Need to get header position and add 2 to get accurate row locations on the spreadsheet
                msmsJsonArray = this.removeDuplicates(msmsJsonArray, headerPosition + 2);
                // Tell the user if duplicate entries were not included
                if (this.duplicates.length > 0) {
                    if (this.errorWarning.length > 0) {
                        this.errorWarning += '<br>';
                    }
                    this.errorWarning += 'Warning: duplicate entries found but not included in .msp';
                }

				// Turn array into a string
				const mspString = this.buildMspStringFromArray(msmsJsonArray, notes);
				// User will be prompted to save a .msp for their data
                this.saveFile(mspString, fileName.split('.')[0] + '.txt');
			}
		} else {
            this.errorWarning = 'Error: column headers not found';
        }
        return this.errorWarning;
	}
}
