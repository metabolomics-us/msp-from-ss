import { TestBed } from '@angular/core/testing';

import { DownloadSpreadsheetService } from './download-spreadsheet.service';

describe('DownloadSpreadsheetService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));
  
    it('should be created', () => {
        const service: DownloadSpreadsheetService = TestBed.get(DownloadSpreadsheetService);
        expect(service).toBeTruthy();
    });
});
