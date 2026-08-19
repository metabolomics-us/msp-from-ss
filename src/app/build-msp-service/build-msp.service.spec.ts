import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BuildMspService, MspJsonRow } from './build-msp.service';
import { HeaderMappingService } from '../header-mapping-service/header-mapping.service';

describe('BuildMspService', () => {
	let service: BuildMspService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [BuildMspService, HeaderMappingService] });
		service = TestBed.inject(BuildMspService);
	});

	it('should be created', () => {
		const bMService: BuildMspService = TestBed.inject(BuildMspService);
		expect(bMService).toBeTruthy();
	});

	// buildMspStringFromArray

	it('should produce formatted string from array', () => {

		const msmsArray: MspJsonRow[] = [{'Name': '1-Methyltryptophan', 'InChIKey': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
		'Precursor_type': '[M+H]+', 'ExactMass': '219.11317', 'Formula': 'C12H14N2O2',
		'_extraComments': [{ header: 'RT', value: '6.23', isSubfield: true }],
		'MSMS SPECTRUM': '35.09272:9 35.16082:7'}];

		const msmsStr: string = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor_type: [M+H]+\n' +
		'ExactMass: 219.11317\nFormula: C12H14N2O2\nComments: RT=6.23\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';

		const testStr = service.buildMspStringFromArray(msmsArray, '');
		expect(testStr).toEqual(msmsStr);

	});
	// should throw error with improper Mz formatting (ex. , instead of : etc.)

	// buildJsonArray
    // should have dataError be true when data is missing
    
    // removeDuplicates

    it('should return array of length 1', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'ExactMass': '219.11317', 'Name': '1-Methyltryptophan',
            'Precursor_type': '[M+H]+', 'Formula': 'C12H14N2O2', 'InChIKey': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '6.23', 'ExactMass': '219.11317', 'Name': '1-Methyltryptophan',
            'Precursor_type': '[M+H]+', 'Formula': 'C12H14N2O2', 'InChIKey': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(1);
    });

    it('should return array of length 2', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'ExactMass': '219.11317', 'Name': '1-Methyltryptophan',
            'Precursor_type': '[M+H]+', 'Formula': 'C12H14N2O2', 'InChIKey': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '5.874', 'ExactMass': '228.0988', 'Name': '2\'-Deoxycytidine',
            'Precursor_type': '[M+H]+', 'Formula': 'C9H13N3O4', 'InChIKey': 'CKTSBUTUHBMZGZ-SHYZEUOFSA-N',
            'MS1 SPECTRUM': '228.0988:275396', 'MSMS SPECTRUM': '35.25149:14 35.48236:5'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(2);
    });

    it('should return array of length 2 after minor change (AVERAGE RT(MIN))', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'ExactMass': '219.11317', 'Name': '1-Methyltryptophan',
            'Precursor_type': '[M+H]+', 'Formula': 'C12H14N2O2', 'InChIKey': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '6.25', 'ExactMass': '219.11317', 'Name': '1-Methyltryptophan',
            'Precursor_type': '[M+H]+', 'Formula': 'C12H14N2O2', 'InChIKey': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(2);
    });

    it('should not flag rows as possible duplicates when InChIKey is missing on all of them', () => {
        // 3 otherwise-distinct entries (different RT/MZ/spectrum), none with an InChIKey.
        //  The old indexOf-based code turned the missing InChIKey into the literal string 'UNDEFINED'
        //  via processText, so every row after the first would be flagged as a possible duplicate of it.
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'ExactMass': '219.11317', 'Name': 'A',
            'Precursor_type': '[M+H]+', 'Formula': 'C12H14N2O2', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '5.874', 'ExactMass': '228.0988', 'Name': 'B',
            'Precursor_type': '[M+H]+', 'Formula': 'C9H13N3O4', 'MSMS SPECTRUM': '35.25149:14 35.48236:5'},
            {'AVERAGE RT(MIN)': '3.33', 'ExactMass': '200.0', 'Name': 'C',
            'Precursor_type': '[M+H]+', 'Formula': 'C1H1', 'MSMS SPECTRUM': '50.7019:2412 77.88785:2832'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(3);
        expect(service.possibleDuplicates.length).toBe(0);
    });

	// hasHeaderErrors

	it('should return false when all headers are present and spelled correctly', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers)).toBe(false);
	});

	it('should return true when one header is misspelled (AVERAGE MZ)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ x', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers)).toBe(true);
	});

	it('should return true when one header is missing (INCHIKEY)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers)).toBe(true);
	});

	it('should properly set error text when headers are misspelled (FORMULA)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA x', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
		service.hasHeaderErrors(headers);
		expect(service.errorWarning).toEqual('These headers may be misspelled or missing: FORMULA');
	});

	it('should properly set error text when headers are misspelled (AVERAGE MZ, MS1 SPECTRUM)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ x', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM x', 'MSMS SPECTRUM'];
		service.hasHeaderErrors(headers);
		expect(service.errorWarning).toEqual('These headers may be misspelled or missing: AVERAGE MZ, MS1 SPECTRUM');
	});

	it('should properly set error text when headers are missing (INCHIKEY)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'MS1 SPECTRUM', 'MSMS SPECTRUM'];
		service.hasHeaderErrors(headers);
		expect(service.errorWarning).toEqual('These headers may be misspelled or missing: INCHIKEY');
	});

	// getRequiredHeaders

	it('should return the post-mapping required key for each required header, for spreadsheet format', () => {
		expect(service.getRequiredHeaders('spreadsheet')).toEqual(
			['AVERAGE RT(MIN)', 'ExactMass', 'Name', 'Precursor_type', 'Formula', 'InChIKey', 'MS1 SPECTRUM', 'MSMS SPECTRUM']
		);
	});

	it('should exclude MS1 SPECTRUM for msdial format', () => {
		expect(service.getRequiredHeaders('msdial')).toEqual(
			['AVERAGE RT(MIN)', 'ExactMass', 'Name', 'Precursor_type', 'Formula', 'InChIKey', 'MSMS SPECTRUM']
		);
	});

	// applyMsdialHeaderAliases

	it('should alias MS/MS SPECTRUM to MSMS SPECTRUM', () => {
		const headers = ['AVERAGE RT(MIN)', 'MS/MS SPECTRUM'];
		expect(service.applyMsdialHeaderAliases(headers)).toEqual(['AVERAGE RT(MIN)', 'MSMS SPECTRUM']);
	});

	it('should leave headers with no MS-DIAL alias unchanged', () => {
		const headers = ['AVERAGE RT(MIN)', 'MSMS SPECTRUM', 'MS1 ISOTOPIC SPECTRUM'];
		expect(service.applyMsdialHeaderAliases(headers)).toEqual(headers);
	});

	// hasHeaderErrors with an explicit requiredHeaders param

	it('should return false for msdial headers missing MS1 SPECTRUM when checked against msdial required headers', () => {
		const headers = ['AVERAGE RT(MIN)', 'ExactMass', 'Name', 'Precursor_type', 'Formula', 'InChIKey', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers, service.getRequiredHeaders('msdial'))).toBe(false);
	});

	it('should still return true when MS1 SPECTRUM is missing and checked against the spreadsheet-format required headers', () => {
		const headers = ['AVERAGE RT(MIN)', 'ExactMass', 'Name', 'Precursor_type', 'Formula', 'InChIKey', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers, service.getRequiredHeaders('spreadsheet'))).toBe(true);
	});

	// buildJsonArray

	it('should treat literal "null" string values as missing when building the JSON array', () => {
		const headers = ['METABOLITE NAME', 'FORMULA', 'INCHIKEY'];
		const data = [['Unknown', 'null', 'null']];
		expect(service.buildJsonArray(headers, data)).toEqual([{'METABOLITE NAME': 'Unknown'}]);
	});

	it('should still include a real (non-"null") value for the same header', () => {
		const headers = ['METABOLITE NAME', 'FORMULA'];
		const data = [['1-Methyltryptophan', 'C12H14N2O2']];
		expect(service.buildJsonArray(headers, data)).toEqual([{'METABOLITE NAME': '1-Methyltryptophan', 'FORMULA': 'C12H14N2O2'}]);
	});

	// removeAttributes with an explicit requiredHeaders param

	it('should keep only the given requiredHeaders when picking attributes', () => {
		const entry = {'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X', 'MS1 SPECTRUM': 'ignored', 'EXTRA': 'drop me'};
		const requiredHeaders = ['AVERAGE RT(MIN)', 'METABOLITE NAME'];
		expect(service.removeAttributes([entry], requiredHeaders)).toEqual([{'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X'}]);
	});

	it('should default to vitalHeaders when no requiredHeaders param is given', () => {
		const entry = {'AVERAGE RT(MIN)': '6.23', 'MS1 SPECTRUM': 'kept', 'EXTRA': 'drop me'};
		expect(service.removeAttributes([entry])).toEqual([{'AVERAGE RT(MIN)': '6.23', 'MS1 SPECTRUM': 'kept'}]);
	});

	// collectMissingData with an explicit requiredHeaders param

	it('should not flag a row as missing when its dict has extra keys the requiredHeaders list does not check', () => {
		// Simulates a dict built against a wider header list than the one collectMissingData checks against
		const jsonArray = [
			{'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.1', 'METABOLITE NAME': 'X', 'ADDUCT TYPE': '[M+H]+',
			 'FORMULA': 'C1', 'INCHIKEY': 'ABC', 'MSMS SPECTRUM': '1:1'}
		];
		const narrowerHeaders = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY'];
		service.collectMissingData(jsonArray, 2, narrowerHeaders);
		expect(service.missingData.length).toBe(0);
	});

	it('should still flag a row missing a header the requiredHeaders list does check', () => {
		const jsonArray = [
			{'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X'}
		];
		service.collectMissingData(jsonArray, 2, ['AVERAGE RT(MIN)', 'METABOLITE NAME', 'FORMULA']);
		expect(service.missingData).toEqual(['2: FORMULA']);
	});

	// processText

	it('should return ["AVERAGE RT(MIN)", "AVERAGE MZ"] when ["Average Rt(min)", " Average Mz "] is sent', () => {
		const incorrect = ['Average Rt(min)', ' Average Mz '];
		const correct = ['AVERAGE RT(MIN)', 'AVERAGE MZ'];
		expect(service.processText(incorrect)).toEqual(correct);
	});

	// lineHasHeaders

	it('should return true if one header is present', () => {
		const headers = ['METABOLITE NAME'];
		expect(service.lineHasHeaders(headers)).toBe(true);
	});

	it('should return true if at least one header is correctly spelled (ADDUCT TYPE)', () => {
		const headers = ['AVERAGE RT(MIN) x', 'AVERAGE MZ x', 'METABOLITE NAME x', 'ADDUCT TYPE',
		'FORMULA x', 'MS1 SPECTRUM x', 'MSMS SPECTRUM x'];
		expect(service.lineHasHeaders(headers)).toBe(true);
	});

	it('should return false if all headers misspelled', () => {
		const headers = ['AVERAGE RT(MIN) x', 'AVERAGE MZZ x', 'METABOLITE NAME x', 'ADDUCT TYPE x',
		'FORMULA x', 'MS1 SPECTRUM x', 'MSMS SPECTRUM x'];
		expect(service.lineHasHeaders(headers)).toBe(false);
	});

	it('should return false if it is not a line of headers', () => {
		const headers = ['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
		'219.11317:1287575', '35.09272:9 35.16082:7'];
		expect(service.lineHasHeaders(headers)).toBe(false);
	});

	it('should return true when a header only matches via a synonym (RETENTION TIME -> AVERAGE RT(MIN))', () => {
		const headers = ['RETENTION TIME', 'BATCH ID'];
		expect(service.lineHasHeaders(headers)).toBe(true);
	});

	// normalizeHeaderRow

	it('should uppercase/trim headers and apply the msdial MS/MS alias when format is msdial', () => {
		const headers = [' Average Rt(min) ', 'MS/MS spectrum'];
		expect(service.normalizeHeaderRow(headers, 'msdial')).toEqual(['AVERAGE RT(MIN)', 'MSMS SPECTRUM']);
	});

	it('should uppercase/trim headers without the msdial alias when format is spreadsheet', () => {
		const headers = [' Average Rt(min) ', 'MS/MS SPECTRUM'];
		expect(service.normalizeHeaderRow(headers, 'spreadsheet')).toEqual(['AVERAGE RT(MIN)', 'MS/MS SPECTRUM']);
	});

	// classifyHeaders

	it('should classify headers against the full recognizedHeaders list, applying each header\'s configured default action', () => {
		const result = service.classifyHeaders(['RETENTION TIME', 'SAMPLE 1', 'BATCH ID', 'METABOLITE NAME']);
		expect(result).toEqual([
			{ header: 'RETENTION TIME', action: 'comment', targetKey: 'RT', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' },
			{ header: 'SAMPLE 1', action: 'ignore', targetKey: null, isSample: true, recognizedAs: null },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false, recognizedAs: null },
			{ header: 'METABOLITE NAME', action: 'map', targetKey: 'Name', isSample: false, recognizedAs: 'METABOLITE NAME' }
		]);
	});

	it('should recognize an optional SMILES column and default it to a Comment sub-field', () => {
		const result = service.classifyHeaders(['smiles']);
		expect(result).toEqual([
			{ header: 'smiles', action: 'comment', targetKey: 'SMILES', isSample: false, recognizedAs: 'SMILES' }
		]);
	});

	// getHeaderPosition

	it('should return 4 when header row is in the 4th position', () => {
		const headers = [[], [], [], [], ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM']];
		expect(service.getHeaderPosition(headers)).toEqual(4);
	});

	it('should return 0 when header row is in the 1st position', () => {
		const headers = [['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'], [], [], [], []];
		expect(service.getHeaderPosition(headers)).toEqual(0);
	});

	it('should return -1 when header row is not present', () => {
		const headers = [[], [], [], [], ['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
		'219.11317:1287575', '35.09272:9 35.16082:7']];
		expect(service.getHeaderPosition(headers)).toBeLessThan(0);
	});

	// Test whether functions are getting called from other functions?

	// buildMspFile
	describe('BuildMspService: buildMspFile', () => {
		let arr: string[][];
		let name: string;
		let testStr: string;

		beforeAll(() => {
			arr = [
				['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
				'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'],
				['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2',
				'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7']
			];
			name = 'test.csv';

			testStr = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor_type: [M+H]+\n' +
			'ExactMass: 219.11317\nFormula: C12H14N2O2\nComments: RT=6.23\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';
		});

		it('should run the real pipeline and save the output file with a .msp extension, regardless of the uploaded file\'s extension', () => {
			vi.spyOn(service, 'saveFile').mockImplementation(() => {});

			service.buildMspFile(arr, name, '');

			expect(service.saveFile).toHaveBeenCalledTimes(1);
			const [savedContent, savedName] = (service.saveFile as Mock).mock.calls[0];
			expect(savedName).toBe('test.msp');
			expect(savedContent).toEqual(testStr);
		});

	});

	// removeRowsWithoutSpectrum

	it('should drop rows without an MSMS SPECTRUM value', () => {
		const jsonArray = [
			{'METABOLITE NAME': 'A', 'MSMS SPECTRUM': '1:1'},
			{'METABOLITE NAME': 'B'}
		];
		expect(service.removeRowsWithoutSpectrum(jsonArray)).toEqual([{'METABOLITE NAME': 'A', 'MSMS SPECTRUM': '1:1'}]);
	});

	// getMissingDataCheckHeaders

	it('should exclude MSMS SPECTRUM from the missing-data check for msdial format', () => {
		const requiredHeaders = service.getRequiredHeaders('msdial');
		expect(service.getMissingDataCheckHeaders('msdial', requiredHeaders)).toEqual(
			['AVERAGE RT(MIN)', 'ExactMass', 'Name', 'Precursor_type', 'Formula', 'InChIKey']
		);
	});

	it('should also exclude MSMS SPECTRUM from the missing-data check for spreadsheet format', () => {
		// A missing spectrum is filtered out by removeRowsWithoutSpectrum for both formats, so it
		//  shouldn't be reported as "missing data" (which implies the row survives with a blank field).
		const requiredHeaders = service.getRequiredHeaders('spreadsheet');
		expect(service.getMissingDataCheckHeaders('spreadsheet', requiredHeaders)).toEqual(
			['AVERAGE RT(MIN)', 'ExactMass', 'Name', 'Precursor_type', 'Formula', 'InChIKey', 'MS1 SPECTRUM']
		);
	});

	// buildMspFile with msdial format, end to end

	describe('BuildMspService: buildMspFile with msdial format', () => {

		it('should build the .msp string applying msdial-specific rules: MS1 not required, MS/MS SPECTRUM alias, null-to-blank, no-spectrum row dropped, no-spectrum row not reported as missing data', () => {
			vi.spyOn(service, 'saveFile').mockImplementation(() => {});

			const arr = [
				['Alignment ID', 'Average Rt(min)', 'Average Mz', 'Metabolite name', 'Adduct type', 'Formula', 'INCHIKEY', 'MS1 isotopic spectrum', 'MS/MS spectrum'],
				['1', '6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.1:100', '35.09272:9 35.16082:7'],
				['2', '9.543', '80.04929', 'Unknown', '[M+H]+', 'null', 'null', '228.1:50', '50.7019:2412 77.88785:2832'],
				['3', '3.33', '200.0', 'ShouldBeFiltered', '[M+H]+', 'C1H1', 'XXXXXXXXXX-UHFFFAOYSA-N', '', '']
			];

			const errorWarning = service.buildMspFile(arr, 'test.txt', '', 'msdial');

			// MS1 SPECTRUM is not required for msdial: no header error even though there's no matching column
			expect(errorWarning).toContain('Warning: Some entries have missing data');
			expect(errorWarning).not.toContain('column headers not found');

			// Row 2 (Unknown, null Formula/INCHIKEY) is reported as missing data.
			//  Row number is 3: headerPosition is 0 (no metadata rows precede the header in this fixture),
			//  so correctionFactor = 0 + 2 = 2, and row 2 is at data-array index 1 (2 + 1 = 3).
			expect(service.missingData).toEqual(['3: Formula, InChIKey']);

			// Row 3 has no spectrum: filtered out, and NOT reported as missing data (would be row 4: 2 + 2)
			expect(service.missingData.some(entry => entry.startsWith('4:'))).toBe(false);

			const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
			expect(mspString).toContain('Name: 1-Methyltryptophan');
			expect(mspString).toContain('Name: Unknown');
			expect(mspString).toContain('Formula: \n'); // Unknown row's null Formula normalized to blank
			expect(mspString).not.toContain('ShouldBeFiltered');
		});

	});

	// buildMspFile with spreadsheet format, end to end: no-spectrum row dropped and not reported as missing data

	describe('BuildMspService: buildMspFile with spreadsheet format, no-spectrum row', () => {

		it('should drop a row missing only its spectrum, without reporting it as missing data', () => {
			vi.spyOn(service, 'saveFile').mockImplementation(() => {});

			const arr = [
				['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
				'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'],
				['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2',
				'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7'],
				['3.33', '200.0', 'ShouldBeFiltered', '[M+H]+', 'C1H1',
				'XXXXXXXXXX-UHFFFAOYSA-N', '200.0:100', '']
			];

			const errorWarning = service.buildMspFile(arr, 'test.csv', '', 'spreadsheet');

			// Row 3 (ShouldBeFiltered) is missing only its spectrum: not reported as missing data
			expect(service.missingData.length).toBe(0);
			expect(errorWarning).not.toContain('Warning: Some entries have missing data');

			const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
			expect(mspString).toContain('Name: 1-Methyltryptophan');
			expect(mspString).not.toContain('ShouldBeFiltered');
		});

	});

	// applyHeaderMappings

	it('should rename a header to its targetKey when action is "map"', () => {
		const headers = ['RETENTION TIME', 'BATCH ID'];
		const mappings = [
			{ header: 'RETENTION TIME', action: 'map' as const, targetKey: 'AVERAGE RT(MIN)', isSample: false },
			{ header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false }
		];
		expect(service.applyHeaderMappings(headers, mappings)).toEqual(['AVERAGE RT(MIN)', 'BATCH ID']);
	});

	// buildMspFile: mapping renames a header before required-header validation runs

	it('should accept a file whose headers only match via user-supplied mapping, with no header errors', () => {
		vi.spyOn(service, 'saveFile').mockImplementation(() => {});
		const arr = [
			['Retention Time', 'Average Mz', 'Metabolite name', 'Adduct type', 'Formula', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'],
			['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7']
		];
		const errorWarning = service.buildMspFile(arr, 'test.csv', '');
		expect(errorWarning).not.toContain('column headers not found');
		expect(errorWarning).not.toContain('may be misspelled or missing');
		const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
		expect(mspString).toContain('Name: 1-Methyltryptophan');
	});

	// applyCommentMappings

	it('should collect a comment-marked header\'s value into _extraComments, labeled by its own header text when unrecognized', () => {
		const jsonArray = [{ 'METABOLITE NAME': 'X', 'NOTES': 'Interesting peak' }];
		const mappings = [{ header: 'NOTES', action: 'comment' as const, targetKey: null, isSample: false }];
		expect(service.applyCommentMappings(jsonArray, mappings)).toEqual([
			{ 'METABOLITE NAME': 'X', 'NOTES': 'Interesting peak', '_extraComments': [{ header: 'NOTES', value: 'Interesting peak', isSubfield: false }] }
		]);
	});

	it('should leave rows unchanged when there are no comment mappings', () => {
		const jsonArray = [{ 'METABOLITE NAME': 'X' }];
		expect(service.applyCommentMappings(jsonArray, [])).toEqual([{ 'METABOLITE NAME': 'X' }]);
	});

	it('should collect a recognized header (e.g. AVERAGE RT(MIN), possibly renamed from a synonym like RETENTION TIME) into _extraComments under its canonical sub-field label, reading via recognizedAs', () => {
		// By the time applyCommentMappings runs, applyHeaderMappings has already renamed a
		// synonym column like 'RETENTION TIME' to its canonical recognizedAs key, so the
		// dict key here is 'AVERAGE RT(MIN)', not the original spreadsheet header text.
		const jsonArray = [{ 'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X' }];
		const mappings = [
			{ header: 'RETENTION TIME', action: 'comment' as const, targetKey: 'RT', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' }
		];
		expect(service.applyCommentMappings(jsonArray, mappings)).toEqual([
			{ 'AVERAGE RT(MIN)': '6.23', 'METABOLITE NAME': 'X', '_extraComments': [{ header: 'RT', value: '6.23', isSubfield: true }] }
		]);
	});

	// buildMspStringFromArray: Comments line merge

	it('should write only the global note on the Comments line when there are no extra comments', () => {
		const msmsArray: MspJsonRow[] = [{ 'METABOLITE NAME': 'X', 'MSMS SPECTRUM': '1:1' }];
		const result = service.buildMspStringFromArray(msmsArray, 'global note');
		expect(result).toContain('Comments: global note\n');
	});

	it('should write only extra comments on the Comments line when there is no global note', () => {
		const msmsArray: MspJsonRow[] = [{ 'METABOLITE NAME': 'X', 'MSMS SPECTRUM': '1:1', '_extraComments': [{ header: 'NOTES', value: 'peak' }] }];
		const result = service.buildMspStringFromArray(msmsArray, '');
		expect(result).toContain('Comments: NOTES: peak\n');
	});

	it('should write the global note followed by extra comments, semicolon-separated', () => {
		const msmsArray: MspJsonRow[] = [{
			'METABOLITE NAME': 'X', 'MSMS SPECTRUM': '1:1',
			'_extraComments': [{ header: 'NOTES', value: 'peak' }, { header: 'BATCH', value: '3' }]
		}];
		const result = service.buildMspStringFromArray(msmsArray, 'global note');
		expect(result).toContain('Comments: global note; NOTES: peak; BATCH: 3\n');
	});

	// buildMspFile end-to-end: an unmatched column marked "comment" survives into the .msp output

	it('should include a comment-mapped column\'s per-row value in the .msp Comments line', () => {
		vi.spyOn(service, 'saveFile').mockImplementation(() => {});
		const arr = [
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM', 'NOTES'],
			['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7', 'Interesting peak']
		];
		// Start from the real auto-classification for every header, then override just NOTES
		//  to "comment" (as a user would via the mapping panel), so the other 8 required
		//  headers still carry their real mapping (and get renamed/validated correctly).
		const headerMappings = service.classifyHeaders(arr[0]).map(mapping =>
			mapping.header === 'NOTES' ? { ...mapping, action: 'comment' as const, targetKey: null } : mapping
		);
		service.buildMspFile(arr, 'test.csv', '', 'spreadsheet', headerMappings);
		const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
		// AVERAGE RT(MIN) also auto-classifies to a Comments sub-field, so NOTES shares the line with RT=
		expect(mspString).toContain('NOTES: Interesting peak');
	});

	// buildMspFile end-to-end: optional SMILES column

	it('should pack a present SMILES column into Comments as a SMILES= sub-field', () => {
		vi.spyOn(service, 'saveFile').mockImplementation(() => {});
		const arr = [
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM', 'SMILES'],
			['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7', 'CN1C=C(C(=O)O)...']
		];
		const errorWarning = service.buildMspFile(arr, 'test.csv', '');
		expect(errorWarning).not.toContain('may be misspelled or missing');
		const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
		expect(mspString).toContain('SMILES=CN1C=C(C(=O)O)...');
	});

	it('should not error when SMILES is absent (optional column)', () => {
		vi.spyOn(service, 'saveFile').mockImplementation(() => {});
		const arr = [
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'],
			['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7']
		];
		const errorWarning = service.buildMspFile(arr, 'test.csv', '');
		expect(errorWarning).not.toContain('may be misspelled or missing');
		const mspString = (service.saveFile as Mock).mock.calls.at(-1)[0] as string;
		expect(mspString).not.toContain('SMILES');
	});

});
