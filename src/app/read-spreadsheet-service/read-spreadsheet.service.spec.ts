import { TestBed } from '@angular/core/testing';
import { ReadSpreadsheetService } from './read-spreadsheet.service';
import { BuildMspService } from '../build-msp-service/build-msp.service';

import { Observable } from 'rxjs';

describe('ReadSpreadsheetService', () => {
	let service: ReadSpreadsheetService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ReadSpreadsheetService, BuildMspService] });
		service = TestBed.inject(ReadSpreadsheetService);
	});

	   it('should be created', () => {
		const rsService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
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
		} as unknown as FileList;

		expect(service.readXlsx(fileList) instanceof Observable).toBe(true);
	});

	it('should return observable from readAlignmentResultTxt', () => {
		const blob = new Blob(['text'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		expect(service.readAlignmentResultTxt(fileList) instanceof Observable).toBe(true);
	});

	it('should parse tab-delimited text into a 2D array of strings', (done) => {
		const content = 'Alignment ID\tAverage Rt(min)\tMetabolite name\n1\t6.23\t1-Methyltryptophan\n';
		const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		service.readAlignmentResultTxt(fileList).subscribe(msmsArray => {
			expect(msmsArray).toEqual([
				['Alignment ID', 'Average Rt(min)', 'Metabolite name'],
				['1', '6.23', '1-Methyltryptophan']
			]);
			done();
		});
	});

	it('should not produce a trailing empty row for a file ending in a newline', (done) => {
		const content = 'Alignment ID\tAverage Rt(min)\n1\t6.23\n';
		const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.txt';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
		} as unknown as FileList;

		service.readAlignmentResultTxt(fileList).subscribe(msmsArray => {
			expect(msmsArray.length).toBe(2);
			done();
		});
	});

	xit('should call buildMspFile from subscriber', () => {

		const blob = new Blob(['0', '1', '2'], {type: 'text/plain;charset=utf-8'});
		blob["name"] = 'filename.xlsx';
		const file = blob as File;
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => file
        } as unknown as FileList;

		const errorText = '';
		const bMService = TestBed.inject(BuildMspService);
		bMService.buildMspFile = jasmine.createSpy('bMF spy');

		const observable = service.readXlsx(fileList);
		observable.subscribe({
			next(arr) {
				bMService.buildMspFile(arr, file.name, '');
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
