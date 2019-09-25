import { TestBed } from '@angular/core/testing';

import { ReadSpreadsheetService } from './read-spreadsheet.service';

describe('ReadSpreadsheetService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ReadSpreadsheetService = TestBed.get(ReadSpreadsheetService);
    expect(service).toBeTruthy();
  });
});
