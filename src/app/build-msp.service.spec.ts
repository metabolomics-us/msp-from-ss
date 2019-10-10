import { TestBed } from '@angular/core/testing';

import { BuildMspService } from './build-msp.service';

describe('BuildMspService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BuildMspService = TestBed.get(BuildMspService);
    expect(service).toBeTruthy();
  });
});
