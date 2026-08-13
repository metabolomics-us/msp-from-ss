import { TestBed } from '@angular/core/testing';
import { BuildMspService } from './build-msp.service';

describe('BuildMspService', () => {
	let service: BuildMspService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [BuildMspService] });
		service = TestBed.inject(BuildMspService);
	});

	it('should be created', () => {
		const bMService: BuildMspService = TestBed.inject(BuildMspService);
		expect(bMService).toBeTruthy();
	});

	// buildMspStringFromArray

	it('should produce formatted string from array', () => {

		const msmsArray: any[] = [{'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
		'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
		'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'}];

		const msmsStr: string = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor Type: [M+H]+\n' +
		'Precursor Mz: 219.11317\nRetention Time: 6.23\nFormula: C12H14N2O2\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';

		const testStr = service.buildMspStringFromArray(msmsArray, '');
		expect(testStr).toEqual(msmsStr);

	});
	// should throw error with improper Mz formatting (ex. , instead of : etc.)

	// buildJsonArray
    // should have dataError be true when data is missing
    
    // removeDuplicates

    it('should return array of length 1', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(1);
    });

    it('should return array of length 2', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '5.874', 'AVERAGE MZ': '228.0988', 'METABOLITE NAME': '2\'-Deoxycytidine',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C9H13N3O4', 'INCHIKEY': 'CKTSBUTUHBMZGZ-SHYZEUOFSA-N',
            'MS1 SPECTRUM': '228.0988:275396', 'MSMS SPECTRUM': '35.25149:14 35.48236:5'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(2);
    });

    it('should return array of length 2 after minor change (AVERAGE RT(MIN))', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '6.25', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'}
        ];
        expect(service.removeDuplicates(jsonArr, 0).length).toBe(2);
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

	it('should return vitalHeaders unchanged for spreadsheet format', () => {
		expect(service.getRequiredHeaders('spreadsheet')).toEqual(service.vitalHeaders);
	});

	it('should exclude MS1 SPECTRUM for msdial format', () => {
		expect(service.getRequiredHeaders('msdial')).toEqual(
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MSMS SPECTRUM']
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
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers, service.getRequiredHeaders('msdial'))).toBe(false);
	});

	it('should still return true when MS1 SPECTRUM is missing and no requiredHeaders param is given (spreadsheet default)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY', 'MSMS SPECTRUM'];
		expect(service.hasHeaderErrors(headers)).toBe(true);
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
		let arr: any[][];
		let name: string;
		let jsonArr: any[];
		let testStr: string;

		beforeAll(() => {
			arr = [
				['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
				'FORMULA', 'INCHIKEY', 'MS1 SPECTRUM', 'MSMS SPECTRUM'],
				['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2',
				'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7']
			];
			name = 'test.csv';

			jsonArr = [
				{'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
				'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
				'MS1 SPECTRUM': '219.11317:1287575', 'MSMS SPECTRUM': '35.09272:9 35.16082:7'}
			];

			testStr = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor Type: [M+H]+\n' +
			'Precursor Mz: 219.11317\nRetention Time: 6.23\nFormula: C12H14N2O2\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';
		});

		it('should call lineHasHeaders', () => {
			spyOn(service, 'lineHasHeaders');
			service.buildMspFile(arr, name, '');
			expect(service.lineHasHeaders).toHaveBeenCalled();
		});

		it('should call functions from buildMspFile()', () => {
			service.getHeaderPosition = jasmine.createSpy('getHeaderPosition() spy').and.returnValue(0);
			service.processText = jasmine.createSpy('processText() spy').and.returnValue(arr[0]);
			service.hasHeaderErrors = jasmine.createSpy('hasHeaderErrors() spy').and.returnValue(false);
			service.buildJsonArray = jasmine.createSpy('buildJsonArray() spy').and.returnValue(jsonArr);
			service.buildMspStringFromArray = jasmine.createSpy('buildMspStringFromArray() spy').and.returnValue(testStr);
			service.saveFile = jasmine.createSpy('saveFile() spy');

			service.buildMspFile(arr, name, '');

			expect(service.getHeaderPosition).toHaveBeenCalled();
			expect(service.processText).toHaveBeenCalled();
			expect(service.hasHeaderErrors).toHaveBeenCalled();
			expect(service.buildJsonArray).toHaveBeenCalled();
			expect(service.buildMspStringFromArray).toHaveBeenCalled();
			expect(service.saveFile).toHaveBeenCalled();
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
			['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE', 'FORMULA', 'INCHIKEY']
		);
	});

	it('should return requiredHeaders unchanged for spreadsheet format', () => {
		const requiredHeaders = service.getRequiredHeaders('spreadsheet');
		expect(service.getMissingDataCheckHeaders('spreadsheet', requiredHeaders)).toEqual(requiredHeaders);
	});

	// buildMspFile with msdial format, end to end

	describe('BuildMspService: buildMspFile with msdial format', () => {

		it('should build the .msp string applying msdial-specific rules: MS1 not required, MS/MS SPECTRUM alias, null-to-blank, no-spectrum row dropped, no-spectrum row not reported as missing data', () => {
			spyOn(service, 'saveFile');

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
			expect(service.missingData).toEqual(['3: FORMULA, INCHIKEY']);

			// Row 3 has no spectrum: filtered out, and NOT reported as missing data (would be row 4: 2 + 2)
			expect(service.missingData.some(entry => entry.startsWith('4:'))).toBe(false);

			const mspString = (service.saveFile as jasmine.Spy).calls.mostRecent().args[0] as string;
			expect(mspString).toContain('Name: 1-Methyltryptophan');
			expect(mspString).toContain('Name: Unknown');
			expect(mspString).toContain('Formula: \n'); // Unknown row's null Formula normalized to blank
			expect(mspString).not.toContain('ShouldBeFiltered');
		});

	});

});
