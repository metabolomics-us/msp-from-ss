import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';

@Injectable({
    providedIn: 'root'
})
export class BuildMspService {
    vitalHeaders: string[];

	constructor() {
		// Moving this here b/c Services can't use oninit
        this.vitalHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
	}

	// Create a string from a 2x2 array of MS/MS data
	buildMspStringFromArray(dataArray: any[]): string {

        // Initialize string to be returned
		let mspString: string = '';
		// A list of mass and intensity for each peak
        let spectrum: string[];

        let hasErrors = false;

		// Traverse each row of dataArray and build mspString
		//  Each row represents data for one metabolite
		dataArray.forEach((element: any) => {

            try {
                mspString +=
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
                    mspString += 'Num Peaks: ' + spectrum.length.toString() + '\n';
                    spectrum.forEach(massIntensity => {
                        mspString += massIntensity.replace(':', ' ') + '\n';
                    });
                }
				mspString = mspString + '\n\n';
			} catch (err) {
                hasErrors = true;
                
                // handleMspStringErrors ???
                // Maybe build string for download of rows w/errors
                // Maybe check for which ones are equal to ''
                // Maybe a scrollable text window with all of the lines w/missing data?
			}
        });
        if (hasErrors) {
            document.getElementById('errorText').innerHTML = '<p>Data may have one or more errors<p>';
        }
		return mspString;
	} // end buildMspStringFromArray


	// Builds array of dictionaries
	buildDictArray(headers: string[], data: string[][]): any[] {
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
    } // end buildDictArray
    

    // Check for any column headers that are misspelled or missing
    hasHeaderErrors(headers: any[]): boolean {

        let hasError: boolean = false;
        let errorText: string = 'These headers may be misspelled or missing:';

        this.vitalHeaders.forEach(headerName => {
            // If a vital header doesn't appear in the headers row, indexOf returns -1
            if (headers.indexOf(headerName) < 0) {
                hasError = true;
                errorText + ' ' + headerName;
            }
        });
        if (hasError) {
            document.getElementById('errorText').innerHTML = '<p>' + errorText + '<p>';
        }
        return hasError;
    } // end hasHeaderErrors


    // Make all headers uppercase and remove extraneous whitespace
    processHeaders(headers: any[]): any[] {
        return headers.map(x => String(x).trim().toUpperCase());
    }


	// Check array for column headers
	lineHasHeaders(line: any[]): boolean {

		// Format the row from the MS/MS spreadsheet to be similar to be uppercase strings, like vitalHeaders
		//  i.e. all uppercase strings
        const formattedCols = this.processHeaders(line);

		// Check if the line contains one of the columns and return true; false otherwise
        let i: number;
		for (i = 0; i < this.vitalHeaders.length; i ++) {
			if (formattedCols.includes(this.vitalHeaders[i])) {
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
	buildMspFile(msmsArray: string[][], fileName: string) {

		// Get the row number where the headers are located
        const headerPosition = this.getHeaderPosition(msmsArray);
        if (headerPosition >= 0) {

            // Get the headers, convert them to upper case and remove trailing white space
            let headers = msmsArray[headerPosition];
            headers = this.processHeaders(headers);

            // If all important headers are available and without errors, proceed
            if (!this.hasHeaderErrors(headers)) {

                const data = msmsArray.slice(headerPosition + 1, msmsArray.length);
                // Create an array of dictionaries
                const msmsDictArray = this.buildDictArray(headers, data);
                // Turn array into a string
                const mspString = this.buildMspStringFromArray(msmsDictArray);
                // Turn string into Blob object so that it can be written into a file
                const blob = new Blob([mspString], {type: 'text/plain;charset=utf-8'});
                // User will be prompted to save a .msp for their data
                saveAs(blob, fileName.split('.')[0] + '.msp');
            } 
        } else {
			document.getElementById('errorText').innerHTML = '<p>Check column headers; one may be missing or misspelled<p>';
		}

	}
}
