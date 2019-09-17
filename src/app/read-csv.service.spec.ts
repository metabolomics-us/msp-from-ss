import { TestBed } from '@angular/core/testing';

import { ReadCsvService } from './read-csv.service';

describe('ReadCsvService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ReadCsvService = TestBed.get(ReadCsvService);
    expect(service).toBeTruthy();
  });
});
