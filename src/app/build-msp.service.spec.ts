import { TestBed } from '@angular/core/testing';
import { BuildMspService } from './build-msp.service';

describe('BuildMspService', () => {
	let service: BuildMspService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [BuildMspService] });
		service = TestBed.get(BuildMspService);
	});

	it('should be created', () => {
		const bMService: BuildMspService = TestBed.get(BuildMspService);
		expect(bMService).toBeTruthy();
	});

	// buildMspStringFromArray

	it('should produce formatted string from array', () => {

		const msmsArray: any[] = [{'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
		'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
		'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'}];

		const msmsStr: string = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor Type: [M+H]+\n' +
		'Precursor Mz: 219.11317\nRetention Time: 6.23\nFormula: C12H14N2O2\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';

		const testStr = service.buildMspStringFromArray(msmsArray);
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
            'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'}
        ];
        expect(service.removeDuplicates(jsonArr).length).toBe(1);
    });

    it('should return array of length 2', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '5.874', 'AVERAGE MZ': '228.0988', 'METABOLITE NAME': '2\'-Deoxycytidine',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C9H13N3O4', 'INCHIKEY': 'CKTSBUTUHBMZGZ-SHYZEUOFSA-N',
            'MS1 ISOTOPIC SPECTRUM': '228.0988:275396', 'MS/MS SPECTRUM': '35.25149:14 35.48236:5'}
        ];
        expect(service.removeDuplicates(jsonArr).length).toBe(2);
    });

    it('should return array of length 2 after minor change (AVERAGE RT(MIN))', () => {
        const jsonArr = [
            {'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'},
            {'AVERAGE RT(MIN)': '6.25', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
            'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
            'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'}
        ];
        expect(service.removeDuplicates(jsonArr).length).toBe(2);
    });

	// hasTextErrors

	it('should return false when all headers are present and spelled correctly', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
		expect(service.hasTextErrors(headers)).toBe(false);
	});

	it('should return true when one header is misspelled (AVERAGE MZ)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ x', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
		expect(service.hasTextErrors(headers)).toBe(true);
	});

	it('should return true when one header is missing (INCHIKEY)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
		expect(service.hasTextErrors(headers)).toBe(true);
	});

	it('should properly set error text when headers are misspelled (FORMULA)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA x', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
		service.hasTextErrors(headers);
		expect(service.errorText).toEqual('These headers may be misspelled or missing: FORMULA');
	});

	it('should properly set error text when headers are misspelled (AVERAGE MZ, MS1 ISOTOPIC SPECTRUM)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ x', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM x', 'MS/MS SPECTRUM'];
		service.hasTextErrors(headers);
		expect(service.errorText).toEqual('These headers may be misspelled or missing: AVERAGE MZ, MS1 ISOTOPIC SPECTRUM');
	});

	it('should properly set error text when headers are missing (INCHIKEY)', () => {
		const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
		service.hasTextErrors(headers);
		expect(service.errorText).toEqual('These headers may be misspelled or missing: INCHIKEY');
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
		'FORMULA x', 'MS1 ISOTOPIC SPECTRUM x', 'MS/MS SPECTRUM x'];
		expect(service.lineHasHeaders(headers)).toBe(true);
	});

	it('should return false if all headers misspelled', () => {
		const headers = ['AVERAGE RT(MIN) x', 'AVERAGE MZZ x', 'METABOLITE NAME x', 'ADDUCT TYPE x',
		'FORMULA x', 'MS1 ISOTOPIC SPECTRUM x', 'MS/MS SPECTRUM x'];
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
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM']];
		expect(service.getHeaderPosition(headers)).toEqual(4);
	});

	it('should return 0 when header row is in the 1st position', () => {
		const headers = [['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
		'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'], [], [], [], []];
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
				'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'],
				['6.23', '219.11317', '1-Methyltryptophan', '[M+H]+', 'C12H14N2O2',
				'ZADWXFSZEAPBJS-JTQLQIEISA-N', '219.11317:1287575', '35.09272:9 35.16082:7']
			];
			name = 'test.csv';

			jsonArr = [
				{'AVERAGE RT(MIN)': '6.23', 'AVERAGE MZ': '219.11317', 'METABOLITE NAME': '1-Methyltryptophan',
				'ADDUCT TYPE': '[M+H]+', 'FORMULA': 'C12H14N2O2', 'INCHIKEY': 'ZADWXFSZEAPBJS-JTQLQIEISA-N',
				'MS1 ISOTOPIC SPECTRUM': '219.11317:1287575', 'MS/MS SPECTRUM': '35.09272:9 35.16082:7'}
			];

			testStr = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor Type: [M+H]+\n' +
			'Precursor Mz: 219.11317\nRetention Time: 6.23\nFormula: C12H14N2O2\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';
		});

		it('should call lineHasHeaders', () => {
			spyOn(service, 'lineHasHeaders');
			service.buildMspFile(arr, name);
			expect(service.lineHasHeaders).toHaveBeenCalled();
		});

		it('should call functions from buildMspFile()', () => {
			service.getHeaderPosition = jasmine.createSpy('getHeaderPosition() spy').and.returnValue(0);
			service.processText = jasmine.createSpy('processText() spy').and.returnValue(arr[0]);
			service.hasTextErrors = jasmine.createSpy('hasTextErrors() spy').and.returnValue(false);
			service.buildJsonArray = jasmine.createSpy('buildJsonArray() spy').and.returnValue(jsonArr);
			service.buildMspStringFromArray = jasmine.createSpy('buildMspStringFromArray() spy').and.returnValue(testStr);
			service.saveFile = jasmine.createSpy('saveFile() spy');

			service.buildMspFile(arr, name);

			expect(service.getHeaderPosition).toHaveBeenCalled();
			expect(service.processText).toHaveBeenCalled();
			expect(service.hasTextErrors).toHaveBeenCalled();
			expect(service.buildJsonArray).toHaveBeenCalled();
			expect(service.buildMspStringFromArray).toHaveBeenCalled();
			expect(service.saveFile).toHaveBeenCalled();
		});

	});

});
