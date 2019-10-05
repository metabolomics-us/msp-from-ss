import { TestBed } from '@angular/core/testing';

import { ReadSpreadsheetService } from './read-spreadsheet.service';

describe('ReadSpreadsheetService', () => {
    let service: ReadSpreadsheetService;
    
	beforeEach(() => TestBed.configureTestingModule({}));

	it('should be created', () => {
		const service: ReadSpreadsheetService = TestBed.get(ReadSpreadsheetService);
		expect(service).toBeTruthy();
    });
    
    it('should return 4 from getHeaderPosition', () => {
        const cols = [[],[],[],[],['AVERAGE RT(MIN)', 'AVERAGE MZ', 'METABOLITE NAME', 'ADDUCT TYPE',
        'FORMULA', 'INCHIKEY', 'MS1 ISOTOPIC SPECTRUM', 'MS/MS SPECTRUM']];
        // expect
    });
});
