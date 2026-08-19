import { Injectable, inject } from '@angular/core';
import { saveAs } from 'file-saver';
import { HeaderMappingService, HeaderMapping, RecognizedHeader } from '../header-mapping-service/header-mapping.service';

export type MspSourceFormat = 'spreadsheet' | 'msdial';

// A comment-mapped header's per-row value, collected for the .msp Comments line
//  (isSubfield: true => "key=value" convention, false/absent => "header: value" convention)
export interface MspExtraComment {
	header: string;
	value: string;
	isSubfield?: boolean;
}

// A row of spreadsheet data keyed by (normalized/mapped) header name, plus the
//  comment-mapped values collected by applyCommentMappings
export type MspJsonRow = Record<string, string> & {
	Name?: string;
	InChIKey?: string;
	Precursor_type?: string;
	ExactMass?: string;
	Formula?: string;
	_extraComments?: MspExtraComment[];
};

@Injectable({
	providedIn: 'root'
})
export class BuildMspService {

	private readonly headerMappingService = inject(HeaderMappingService);

    errorWarning = '';
    missingData: string[] = [];
    duplicates: string[] = [];
    possibleDuplicates: string[] = [];
    vitalHeaders: string[];
    // Drives auto-classification: each spreadsheet-side header's default action/output tag,
    //  plus whether it's required for a valid upload.
    recognizedHeaders: (RecognizedHeader & { required: boolean })[];
    // The real MSP header-tag vocabulary offered in the "Maps to MSP Tag" dropdown
    mspTags: string[];

	constructor() {
		// Moving this here b/c Services can't use oninit
        this.resetErrors();
		this.vitalHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
		this.recognizedHeaders = [
			{ key: 'AVERAGE RT(MIN)', action: 'comment', targetKey: 'RT', required: true },
			{ key: 'AVERAGE MZ', action: 'map', targetKey: 'ExactMass', required: true },
			{ key: 'METABOLITE NAME', action: 'map', targetKey: 'Name', required: true },
			{ key: 'ADDUCT TYPE', action: 'map', targetKey: 'Precursor_type', required: true },
			{ key: 'FORMULA', action: 'map', targetKey: 'Formula', required: true },
			{ key: 'INCHIKEY', action: 'map', targetKey: 'InChIKey', required: true },
			{ key: 'MS1 SPECTRUM', action: 'ignore', targetKey: null, required: true },
			{ key: 'MSMS SPECTRUM', action: 'map', targetKey: 'MSMS SPECTRUM', required: true },
			{ key: 'SMILES', action: 'comment', targetKey: 'SMILES', required: false }
		];
		this.mspTags = ['Name', 'Synon', 'MW', 'Formula', 'ExactMass', 'CAS#', 'NIST#', 'DB#',
		'Comment', 'Mods', 'InChIKey', 'RelativeArea', 'Precursor_type'];
    }


	// Vital headers required for a given source format
	//  MS-DIAL uploads don't require MS1 SPECTRUM: it's validated but never written into the .msp output
	getRequiredHeaders(format: MspSourceFormat): string[] {
		const required = this.recognizedHeaders
			.filter(config => config.required)
			.map(config => config.action === 'map' ? (config.targetKey as string) : config.key);
		if (format === 'msdial') {
			return required.filter(header => header !== 'MS1 SPECTRUM');
		}
		return required;
	}


	// MS-DIAL uses 'MS/MS spectrum' where this app's own headers use 'MSMS SPECTRUM'
	applyMsdialHeaderAliases(headers: string[]): string[] {
		return headers.map(header => header === 'MS/MS SPECTRUM' ? 'MSMS SPECTRUM' : header);
	}


	// Normalize a raw header row: trim/uppercase, then apply the msdial-specific alias
	normalizeHeaderRow(headers: string[], format: MspSourceFormat): string[] {
		let normalized = this.processText(headers);
		if (format === 'msdial') {
			normalized = this.applyMsdialHeaderAliases(normalized);
		}
		return normalized;
	}

	// Classify already-normalized headers against the full recognized-header list
	classifyHeaders(headers: string[], dataRows: string[][] = []): HeaderMapping[] {
		return this.headerMappingService.classify(headers, this.recognizedHeaders, dataRows);
	}


	// Rename headers with action "map" to their targetKey (real MSP tag or pinned key);
	//  a recognized comment/ignore header (e.g. a synonym like RETENTION TIME) is renamed to
	//  its canonical recognizedAs key instead, so required-header validation still finds it.
	//  An unrecognized header (no mapping match) is left as-is.
	applyHeaderMappings(headers: string[], mappings: HeaderMapping[]): string[] {
		return headers.map(header => {
			const mapping = mappings.find(m => m.header === header);
			if (!mapping) {
				return header;
			}
			if (mapping.action === 'map' && mapping.targetKey) {
				return mapping.targetKey;
			}
			return mapping.recognizedAs || header;
		});
	}


	// Collect each comment-mapped header's per-row value into a row's _extraComments array.
	//  A recognized header (targetKey set, e.g. RT/SMILES) is packed under its canonical
	//  sub-field label with the real-MSP "key=value" convention; an arbitrary user-chosen
	//  column (targetKey null) keeps the freeform "header: value" convention.
	applyCommentMappings(jsonArray: MspJsonRow[], mappings: HeaderMapping[]): MspJsonRow[] {
		const commentMappings = mappings.filter(m => m.action === 'comment');
		if (commentMappings.length === 0) {
			return jsonArray;
		}
		return jsonArray.map(entry => {
			const extraComments: MspExtraComment[] = [];
			commentMappings.forEach(mapping => {
				const entryKey = mapping.recognizedAs || mapping.header;
				if (entry[entryKey]) {
					const label = mapping.targetKey || mapping.header;
					extraComments.push({ header: label, value: entry[entryKey], isSubfield: !!mapping.targetKey });
				}
			});
			return extraComments.length > 0 ? { ...entry, '_extraComments': extraComments } as MspJsonRow : entry;
		});
	}


	// A spectrum-less entry isn't useful in a spectral library, regardless of source format
	removeRowsWithoutSpectrum(jsonArray: MspJsonRow[]): MspJsonRow[] {
		return jsonArray.filter(entry => !!entry['MSMS SPECTRUM']);
	}


	// A missing spectrum is handled by removeRowsWithoutSpectrum for both formats, not reported as missing data
	//  (format is kept in the signature for call-site consistency and in case a future format needs different behavior)
	getMissingDataCheckHeaders(format: MspSourceFormat, requiredHeaders: string[]): string[] {
		return requiredHeaders.filter(header => header !== 'MSMS SPECTRUM');
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
	buildMspStringFromArray(dataArray: MspJsonRow[], mspNotes: string): string {

		// Each pushed string is later joined into the final .msp text
		const lines: string[] = [];

		// Traverse each row of dataArray and build mspString
		//  Each row represents data for one metabolite
		dataArray.forEach(element => {

            lines.push(
                'Name: ' + (element['Name'] || '') + '\n' +
                'InChIKey: ' + (element['InChIKey'] || '') + '\n' +
                'Precursor_type: ' + (element['Precursor_type'] || '') + '\n' +
                'ExactMass: ' + (element['ExactMass'] || '') + '\n' +
                'Formula: ' + (element['Formula'] || '') + '\n'
            );

            const commentParts: string[] = [];
            if (mspNotes) {
                commentParts.push(mspNotes);
            }
            if (element['_extraComments']) {
                element['_extraComments'].forEach(comment => {
                    commentParts.push(comment.isSubfield ? comment.header + '=' + comment.value : comment.header + ': ' + comment.value);
                });
            }
            if (commentParts.length > 0) {
                lines.push('Comments: ' + commentParts.join('; ') + '\n');
            }
            // Create array of mass/intensity peaks to be written into the string line by line
            //  First check that MSMS spectrum data exists
            if (element['MSMS SPECTRUM'] && element['MSMS SPECTRUM'].length > 0) {
                const spectrum: string[] = element['MSMS SPECTRUM'].split(' ');
                lines.push('Num Peaks: ' + spectrum.length.toString() + '\n');
                spectrum.forEach(massIntensity => {
                    lines.push(massIntensity.replace(':', ' ') + '\n');
                });
            } else {
                lines.push('Num Peaks: ');
            }
            lines.push('\n\n');
        });
		return lines.join('');
    } // end buildMspStringFromArray


    // Record all lines with missing data
    collectMissingData(jsonArray: MspJsonRow[], correctionFactor: number, requiredHeaders: string[] = this.vitalHeaders) {
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
    removeAttributes(jsonArray: MspJsonRow[], requiredHeaders: string[] = this.vitalHeaders): MspJsonRow[] {
        return jsonArray.map((entry): MspJsonRow => Object.fromEntries(
            requiredHeaders.filter(header => header in entry).map((header): [string, string] => [header, entry[header]])
        ));
    }

    // Remove duplicate entries in the JSON array based on avg retention time and avg m/z
    removeDuplicates(jsonArray: MspJsonRow[], correctionFactor: number): MspJsonRow[] {

        // Compare attributes that indicate duplicates may have been entered
        //  Turn entries into strings for easy comparison
        let stringsArray = jsonArray.map(x => JSON.stringify([x['AVERAGE RT(MIN)'], x['ExactMass'], x['MSMS SPECTRUM']]));
        stringsArray = this.processText(stringsArray);
        // Create array of connectivity hashes from InChiKey (i.e. first section of InChiKey)
        //  If these are the same for two entries, they may be duplicates
        const firstHashArray: string[] = this.processText(jsonArray.map(x => x['InChIKey']));

        // Track the first index at which each string/hash was seen, for O(1) lookups instead of O(n) indexOf
        const firstSeenString = new Map<string, number>();
        const firstSeenHash = new Map<string, number>();
        // Create new JSON array and push only one entry for each name
        const cleanedArray: MspJsonRow[] = [];
        for (let i = 0; i < stringsArray.length; i++) {
            const key = stringsArray[i];
            const firstStringIndex = firstSeenString.get(key);
            // Check for likely duplicates
            if (firstStringIndex === undefined) {
                firstSeenString.set(key, i);
                cleanedArray.push(jsonArray[i]);
                const hash = firstHashArray[i];
                // Skip the connectivity-hash comparison when InChIKey is missing (processText
                // turns a missing value into the literal string 'UNDEFINED') — otherwise every
                // row lacking an InChIKey collapses into one meaningless "possible duplicate" bucket
                if (hash !== 'UNDEFINED') {
                    // Check for possible duplicates; mark them, don't remove them
                    const firstHashIndex = firstSeenHash.get(hash);
                    if (firstHashIndex !== undefined) {
                        this.possibleDuplicates.push(String(firstHashIndex + correctionFactor) + ' & ' + String(i + correctionFactor))
                    } else {
                        firstSeenHash.set(hash, i);
                    }
                }
            } else {
                this.duplicates.push(String(firstStringIndex + correctionFactor) + ' & ' + String(i + correctionFactor));
            }

        }
        return cleanedArray;
    } // end removeDuplicates


	// Builds array of dictionaries
	buildJsonArray(headers: string[], data: string[][]): MspJsonRow[] {
		// Iterate through data and build dictionary
		// keys=headers[], values=row of data[][]

		const arr: MspJsonRow[] = [];
		for (const row of data) {
			const dict: MspJsonRow = {};
			for (let j = 0; j < headers.length; j++) {
				// MS-DIAL writes the literal string "null" for missing values instead of an empty cell
				if (row[j] && row[j] !== 'null') {
					dict[headers[j]] = row[j];
				}
			}
			// Add dictionary to the array
			arr.push(dict);
		}
		return arr;
	} // end buildJsonArray


	// Check for any column headers that are misspelled or missing
	hasHeaderErrors(headers: string[], requiredHeaders: string[] = this.vitalHeaders): boolean {

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
	//  Accepts undefined entries (e.g. a row missing an optional column like InChIKey) and
	//  stringifies them via String(x), which intentionally turns a missing value into the
	//  literal text 'UNDEFINED' rather than an empty string — callers rely on that sentinel.
	processText(headers: (string | undefined)[]): string[] {
		return headers.map(x => String(x).trim().toUpperCase());
	}


	// Check if array has the vital headers, via exact match or a known synonym
	lineHasHeaders(line: string[]): boolean {
		const formattedHeaders = this.processText(line);
		return formattedHeaders.some(header => this.headerMappingService.suggestKey(header, this.vitalHeaders) !== null);
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
	//  msmsArray accepts null so callers that guard on a possibly-null cached array
	//  (e.g. ReadSpreadsheetComponent.cachedMsmsArray) don't need a non-null assertion;
	//  a null/empty array is treated as "no header row found", same as any other malformed input.
	buildMspFile(msmsArray: string[][] | null, fileName: string, notes: string, format: MspSourceFormat = 'spreadsheet', headerMappings?: HeaderMapping[]): string {

		// Reset the error text
        this.resetErrors();

        const rows = msmsArray || [];
        const requiredHeaders = this.getRequiredHeaders(format);
		const headerPosition = this.getHeaderPosition(rows);

		if (headerPosition < 0) {
			this.errorWarning = 'Error: column headers not found';
			return this.errorWarning;
		}

		const headers = this.normalizeHeaderRow(rows[headerPosition], format);
		const data = rows.slice(headerPosition + 1, rows.length);
		const mappings = headerMappings || this.classifyHeaders(headers, data);
		const mappedHeaders = this.applyHeaderMappings(headers, mappings);

		if (this.hasHeaderErrors(mappedHeaders, requiredHeaders)) {
			return this.errorWarning;
		}

		let msmsJsonArray: MspJsonRow[] = this.buildJsonArray(mappedHeaders, data);

		// Collect comment-mapped columns' values before removeAttributes strips the originals
		msmsJsonArray = this.applyCommentMappings(msmsJsonArray, mappings);

		// remove unneeded attributes (keep _extraComments alongside the required headers)
		msmsJsonArray = this.removeAttributes(msmsJsonArray, [...requiredHeaders, '_extraComments']);

		// Use header position to get row number; check for missing data per each header
		//  (a spectrum-less row is filtered below, not reported as missing data, for either format)
		const missingDataCheckHeaders = this.getMissingDataCheckHeaders(format, requiredHeaders);
		this.collectMissingData(msmsJsonArray, headerPosition + 2, missingDataCheckHeaders);
		if (this.missingData.length > 0) {
			this.errorWarning = 'Warning: Some entries have missing data; these attributes were left blank';
		}

		// Remove duplicate entries
		//  Need to get header position and add 2 to get accurate row locations on the spreadsheet
		msmsJsonArray = this.removeDuplicates(msmsJsonArray, headerPosition + 2);
		// Tell the user if duplicate entries were not included
		if (this.duplicates.length > 0) {
			if (this.errorWarning.length > 0) {
				// Rendered via [innerHTML] in the template, so this becomes a real line break
				this.errorWarning += '<br>';
			}
			this.errorWarning += 'Warning: duplicate entries found but not included in .msp';
		}

		// Drop rows with no MS/MS spectrum: not useful in a spectral library, regardless of source
		msmsJsonArray = this.removeRowsWithoutSpectrum(msmsJsonArray);

		// Turn array into a string
		const mspString = this.buildMspStringFromArray(msmsJsonArray, notes);
		// User will be prompted to save a .msp for their data
		this.saveFile(mspString, fileName.split('.')[0] + '.msp');

		return this.errorWarning;
	}
}
