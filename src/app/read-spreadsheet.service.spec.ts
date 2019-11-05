import { TestBed } from '@angular/core/testing';
import { ReadSpreadsheetService } from './read-spreadsheet.service';
import { BuildMspService } from './build-msp.service';

import { Observable } from 'rxjs';

describe('ReadSpreadsheetService', () => {
	let service: ReadSpreadsheetService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ReadSpreadsheetService, BuildMspService] });
		service = TestBed.get(ReadSpreadsheetService);
	});

	   it('should be created', () => {
		const rsService: ReadSpreadsheetService = TestBed.get(ReadSpreadsheetService);
		expect(rsService).toBeTruthy();
	});

	// it('should return observable from readCsv', () => {
	// 	const dummyInput = document.createElement('input');
	// 	const files = dummyInput.files;
	// 	expect(service.readCsv(files) instanceof Observable).toBe(true);
	// });

	it('should return observable from readXlsx', () => {

		// Two strategies, both seem to work

		// const dummyInput = document.createElement('input');
		// const files = dummyInput.files;

		const blob = new Blob(['text'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.xlsx';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		};

		expect(service.readXlsx(fileList) instanceof Observable).toBe(true);
	});

	xit('should call buildMspFile from subscriber', () => {

		const blob = new Blob(['0', '1', '2'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.xlsx';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
        };

		const errorText = '';
		const bMService = TestBed.get(BuildMspService);
		bMService.buildMspFile = jasmine.createSpy('bMF spy');

		const observable = service.readXlsx(fileList);
		observable.subscribe({
			next(arr) {
				bMService.buildMspFile(arr, name);
				expect(bMService.buildMspFile).toHaveBeenCalled();
			},
			error(err) { console.error('something wrong occurred: ' + err); },
			complete() {
				// expect(bMService.buildMspFile).toHaveBeenCalled();
				console.log('Done');
			}
		});
	});

});
