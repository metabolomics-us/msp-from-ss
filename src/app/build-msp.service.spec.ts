import { TestBed } from '@angular/core/testing';

import { BuildMspService } from './build-msp.service';

fdescribe('BuildMspService', () => {
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

        const msmsArray: any[] = [{'AVERAGE RT(MIN)':'6.23', 'AVERAGE MZ':'219.11317', 'METABOLITE NAME':'1-Methyltryptophan',
        'ADDUCT TYPE':'[M+H]+', 'FORMULA':'C12H14N2O2', 'INCHIKEY':'ZADWXFSZEAPBJS-JTQLQIEISA-N', 
        'MS1 ISOTOPIC SPECTRUM':'219.11317:1287575', 'MS/MS SPECTRUM':'35.09272:9 35.16082:7'}]; 

        const msmsStr: string = 'Name: 1-Methyltryptophan\nInChIKey: ZADWXFSZEAPBJS-JTQLQIEISA-N\nPrecursor Type: [M+H]+\n' + 
        'Precursor Mz: 219.11317\nRetention Time: 6.23\nFormula: C12H14N2O2\nNum Peaks: 2\n35.09272 9\n35.16082 7\n\n\n';

        const testStr = service.buildMspStringFromArray(msmsArray);
        expect(testStr).toEqual(msmsStr);

    });
    // should throw error with improper Mz formatting (ex. , instead of : etc.)

    // buildDictArray
    // should have dataError be true when data is missing

    // hasHeaderErrors

    it('should return false when all headers are present and spelled correctly', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        expect(service.hasHeaderErrors(headers)).toBe(false);
    });
    
    it('should return true when one header is misspelled (AVERAGE MZ)', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ x', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        expect(service.hasHeaderErrors(headers)).toBe(true);
    });
    
    it('should return true when one header is missing (INCHIKEY)', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        expect(service.hasHeaderErrors(headers)).toBe(true);
    });

    it('should properly set error text when headers are misspelled (FORMULA)', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA x', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM'];
        service.hasHeaderErrors(headers);
        expect(service.errorText).toEqual('These headers may be misspelled or missing: FORMULA');
    });

    it('should properly set error text when headers are misspelled (AVERAGE MZ, MS1 ISOTOPIC SPECTRUM)', () => {
        const headers = ['AVERAGE RT(MIN)', 'AVERAGE MZ x', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM x', 'MS/MS SPECTRUM'];
        service.hasHeaderErrors(headers);
        expect(service.errorText).toEqual('These headers may be misspelled or missing: AVERAGE MZ, MS1 ISOTOPIC SPECTRUM');
    });

    // processHeaders

    it('should return ["AVERAGE RT(MIN)", "AVERAGE MZ"] when ["Average Rt(min)", " Average Mz "] is sent', () => {
        const incorrect = ["Average Rt(min)", " Average Mz "];
        const correct = ["AVERAGE RT(MIN)", "AVERAGE MZ"];
        expect(service.processHeaders(incorrect)).toEqual(correct);
    });

    // lineHasHeaders

    it('should return true if one header is present', () => {
        const headers = ['METABOLITE NAME'];
        expect(service.lineHasHeaders(headers)).toBe(true);
    });
    
    it('should return true if at least one header is correctly spelled (ADDUCT TYPE)', () => {
        const headers = ['AVERAGE RT(MIN) x', 'AVERAGE MZZ x', 'METABOLITE NAME x', 'ADDUCT TYPE',
        'FORMULA x', 'MS1 ISOTOPIC SPECTRUM x', 'MS/MS SPECTRUM x'];
        expect(service.lineHasHeaders(headers)).toBe(true);
    });

    it('should return false if all headers misspelled', () => {
        const headers = ['AVERAGE RT(MIN) x', 'AVERAGE MZZ x', 'METABOLITE NAME x', 'ADDUCT TYPE x',
        'FORMULA x', 'MS1 ISOTOPIC SPECTRUM x', 'MS/MS SPECTRUM x'];
        expect(service.lineHasHeaders(headers)).toBe(false);
    });

    it('should return false if it is not a line of headers', () => {
        const headers = ['6.23', '219.11317', '1-Methyltryptophan','[M+H]+', 'C12H14N2O2', 'ZADWXFSZEAPBJS-JTQLQIEISA-N', 
        '219.11317:1287575', '35.09272:9 35.16082:7'];
        expect(service.lineHasHeaders(headers)).toBe(false);
    });

    // getHeaderPosition
    // should return 4 when headers are in the 4th position
    // should return 0 when headers are in the 1st position
    // should return -1 when no headers are present
    
    // it('should return 4 from getHeaderPosition', () => {
    //     const cols = [[],[],[],[],['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
    //     'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM']];
    //     // expect
    // });
});
