import { TestBed } from '@angular/core/testing';
import { ReadSpreadsheetService } from './read-spreadsheet.service';

// Need to create component so that the innerHTML can be set from the service for this test
import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component';

describe('ReadSpreadsheetService', () => {
    let service: ReadSpreadsheetService;
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

});
