import { TestBed } from '@angular/core/testing';

import { DownloadFileService } from './download-file.service';

describe('DownloadFileService', () => {
	let service: DownloadFileService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [DownloadFileService] });
		service = TestBed.get(DownloadFileService);
	});

	it('should be created', () => {
		const dFService: DownloadFileService = TestBed.get(DownloadFileService);
		expect(dFService).toBeTruthy();
	});

	it('should download example files', () => {

		// create spy object with a click() method
		const spyObj = jasmine.createSpyObj('a', ['click']);
		// spy on document.createElement() and return the spy object
		spyOn(document, 'createElement').and.returnValue(spyObj);

		service.downloadFile('../assets/files-to-read/', 'example.msp');

		expect(document.createElement).toHaveBeenCalledTimes(1);
		expect(document.createElement).toHaveBeenCalledWith('a');

		expect(spyObj.href).toBe('../assets/files-to-read/example.msp');
		expect(spyObj.target).toBe('_blank');
		expect(spyObj.download).toBe('example.msp');
		expect(spyObj.click).toHaveBeenCalledTimes(1);
		expect(spyObj.click).toHaveBeenCalledWith();
	});
});
