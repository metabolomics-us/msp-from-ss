import { TestBed } from '@angular/core/testing';

import { DownloadFileService } from './download-file.service';

describe('DownloadFileService', () => {
	let service: DownloadFileService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [DownloadFileService] });
		service = TestBed.inject(DownloadFileService);
	});

	it('should be created', () => {
		const dFService: DownloadFileService = TestBed.inject(DownloadFileService);
		expect(dFService).toBeTruthy();
	});

	it('should download example files', () => {

		// create spy object with a click() method, plus the props downloadFile() will set on it
		const spyObj: { click: () => void, href?: string, target?: string, download?: string } = { click: vi.fn() };
		// spy on document.createElement() and return the spy object
		vi.spyOn(document, 'createElement').mockReturnValue(spyObj as unknown as HTMLElement);

		service.downloadFile('../assets/files-to-read/', 'example.msp');

		expect(document.createElement).toHaveBeenCalledTimes(1);
		expect(document.createElement).toHaveBeenCalledWith('a');

		expect(spyObj.href).toBe('../assets/files-to-read/example.msp');
		expect(spyObj.target).toBe('_blank');
		expect(spyObj.download).toBe('example.msp');
		expect(spyObj.click).toHaveBeenCalledTimes(1);
		expect(spyObj.click).toHaveBeenCalledWith();
	});

	it('should download an example file, converting its anchor name to a real filename', () => {
		const spyObj = { click: vi.fn() };
		vi.spyOn(document, 'createElement').mockReturnValue(spyObj as unknown as HTMLElement);

		service.downloadExampleFile('example_msp-txt');

		expect((spyObj as any).href).toBe('../assets/files-to-read/example_msp.txt');
		expect((spyObj as any).download).toBe('example_msp.txt');
		expect(spyObj.click).toHaveBeenCalledTimes(1);
	});
});
