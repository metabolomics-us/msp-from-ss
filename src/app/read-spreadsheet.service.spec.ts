import { TestBed } from '@angular/core/testing';

import { ReadSpreadsheetService } from './read-spreadsheet.service';

// Need to create component so that the innerHTML can be set from the service for this test
import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component';

fdescribe('ReadSpreadsheetService', () => {
    let service: ReadSpreadsheetService;

    // Trying something
    let component: ReadSpreadsheetComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({ declarations: [ ReadSpreadsheetComponent ], providers: [ReadSpreadsheetService] });
        service = TestBed.get(ReadSpreadsheetService);

        // Need to create component so that the innerHTML can be set from the service for this test
        TestBed.createComponent(ReadSpreadsheetComponent);
    });

	it('should be created', () => {
		const rsService: ReadSpreadsheetService = TestBed.get(ReadSpreadsheetService);
		expect(rsService).toBeTruthy();
    });

    // buildMspStringFromArray
    it('should produce formatted string from array', () => {

        const msmsArray: any[] = [{'AVERAGE RT(MIN)':'6.23', 'AVERAGE MZ':'219.11317', 'METABOLITE NAME':'1-Methyltryptophan',
        'ADDUCT TYPE':'[M+H]+', 'FORMULA':'C12H14N2O2', 'INCHIKEY':'ZADWXFSZEAPBJS-JTQLQIEISA-N', 
        'MS1 ISOTOPIC SPECTRUM':'219.11317:1287575', 'MS/MS SPECTRUM':'35.09272:9 35.16082:7'}]; 

        const msmsStr: string = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor Type: [M+H]+\n' + 
        'Precursor Mz: 219.11317\nRetention Time: 6.23\nFormula: C12H14N2O2\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';

        const testStr = service.buildMspStringFromArray(msmsArray);
        expect(testStr).toEqual(msmsStr);

    });
    // Should throw error with improper Mz formatting (ex. , instead of : etc.)

    // buildDictArray
    // should have dataError be true when data is missing

    // hasHeaderErrors
    it('Should return false when all headers are present and spelled correctly', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        expect(service.hasHeaderErrors(headers)).toBe(false);
    });
    
    it('Should return true when one header is misspelled (AVERAGE MZ)', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        expect(service.hasHeaderErrors(headers)).toBe(true);
    });
    
    it('Should return true when one header is missing (INCHIKEY)', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        expect(service.hasHeaderErrors(headers)).toBe(true);
    });

    // processHeaders
    it('Should return ["AVERAGE RT(MIN)", "AVERAGE MZ"] when ["Average Rt(min)", " Average Mz "] is sent', () => {
        const incorrect = ["Average Rt(min)", " Average Mz "];
        const correct = ["AVERAGE RT(MIN)", "AVERAGE MZ"];
        expect(service.processHeaders(incorrect)).toEqual(correct);
    });

    // lineHasHeaders
    // Should return true if one header is present
    // Should return true if one header is misspelled

    // getHeaderPosition
    // Should return 4 when headers are in the 4th position
    // Should return 0 when headers are in the 1st position
    // Should return -1 when no headers are present
    
    // it('should return 4 from getHeaderPosition', () => {
    //     const cols = [[],[],[],[],['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
    //     'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM']];
    //     // expect
    // });
});
