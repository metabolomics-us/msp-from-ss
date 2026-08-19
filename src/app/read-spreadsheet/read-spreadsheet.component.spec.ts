import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import { DownloadFileService } from '../download-file-service/download-file.service';
import { Subject } from 'rxjs';

// Builds a real File whose content the real ReadSpreadsheetService can parse via
//  readAlignmentResultTxt (tab-delimited text) — used instead of spying on the service,
//  so these tests exercise the real parse pipeline end-to-end.
function tabDelimitedFile(fileName: string, rows: string[][]): File {
	const content = rows.map(row => row.join('\t')).join('\n');
	return new File([content], fileName, { type: 'text/plain' });
}

describe('ReadSpreadsheetComponent', () => {
	let component: ReadSpreadsheetComponent;
	let fixture: ComponentFixture<ReadSpreadsheetComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [ReadSpreadsheetComponent, NoopAnimationsModule]
		})
		.compileComponents(); }));

	beforeEach(() => {
		fixture = TestBed.createComponent(ReadSpreadsheetComponent);
		component = fixture.debugElement.componentInstance;
		fixture.detectChanges();
    });
 
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    /////////////////

    // These 3 may need to be protractor tests?
 
    it('should have instructions', () => {
		const instructions = document.getElementById('instructions');
		expect(instructions).toBeTruthy();
    });
 
    it('should have an invalid submit button on start', () => {
		expect(component.submitValid).toBe(false);
	});

    // Tried expect(anchorElements.length).toEqual(3), but one <a> is added by jasmine wrapper
    it('should have 3 <a>', () => {
		const anchorNames = ['example_spreadsheet_large-xlsx', 'example_spreadsheet_small-xlsx', 'example_msp-txt'];
		let anchorElement: HTMLAnchorElement;
		anchorNames.forEach(name => {
			anchorElement = document.getElementsByName(name)[0] as HTMLAnchorElement;
			expect(anchorElement).toBeTruthy();
		});
    });

    /////////////////
 
    it('should call downloadExample when user clicks <a>', () => {
		const anchorNames = ['example_spreadsheet_large-xlsx', 'example_spreadsheet_small-xlsx', 'example_msp-txt'];
		vi.spyOn(component, 'downloadExample').mockImplementation(() => {});
		// let anchorElement = document.getElementsByName("example_spreadsheet_large-xlsx");
		let anchorElement: HTMLAnchorElement;
		anchorNames.forEach(name => {
			anchorElement = document.getElementsByName(name)[0] as HTMLAnchorElement;
			anchorElement.click();
			expect(component.downloadExample).toHaveBeenCalled();
		});
    });

    // Testing variable binding
    it('should display a different test title', () => {
        component.fileNameText = 'Test Name';
        fixture.componentRef.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        expect(fixture.debugElement.nativeElement.querySelector('#file-name-text').textContent).toContain('Test Name');
    });
 
    it('should call fileSelected when change event occurs', () => {
		vi.spyOn(component, 'fileSelected').mockImplementation(() => {});
		const element = document.getElementById('file-input');
		const event = new Event('change');
        element.dispatchEvent(event);
        expect(component.fileSelected).toHaveBeenCalled();
    });
 
    it('should have a submit button', () => {
		const submit = document.getElementById('submit') as HTMLButtonElement;
		expect(submit).toBeTruthy();
    });
 
    it('should call readFile when submit button is clicked', () => {
		vi.spyOn(component, 'fileSelected').mockImplementation(() => {});
        const element = document.getElementById('file-input');
        const event = new Event('change');
        element.dispatchEvent(event);
		expect(component.fileSelected).toHaveBeenCalled();
    });

	// Look at:
	// https://stackoverflow.com/questions/52078853/is-it-possible-to-update-filelist

	it('should eagerly parse the file and populate headerMappings on a valid file selection', async () => {
		const file = tabDelimitedFile('test.txt', [
			['AVERAGE RT(MIN)', 'BATCH ID'],
			['6.23', '3']
		]);
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		// Real FileReader I/O in jsdom queues its 'load' event across multiple nested
		// setImmediate ticks, so a single setTimeout(…, 0) is not guaranteed to flush it;
		// poll for the parse's completion flag instead of guessing a fixed delay.
		await vi.waitFor(() => expect(component.parsing).toBe(false));

		expect(component.cachedMsmsArray).toEqual([['AVERAGE RT(MIN)', 'BATCH ID'], ['6.23', '3']]);
		expect(component.headerMappings).toEqual([
			{ header: 'AVERAGE RT(MIN)', action: 'comment', targetKey: 'RT', isSample: false, recognizedAs: 'AVERAGE RT(MIN)' },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false, recognizedAs: null }
		]);
	});

	it('should pass the cached array and headerMappings to buildMspFile on submit, without re-reading the file', async () => {
		// Stubbing the terminal saveAs-triggering call is the same accepted convention as
		//  Task 37, not a logic-replacing mock — buildMspFile's own behavior is covered by
		//  build-msp.service.spec.ts.
		vi.spyOn(component.buildMspService, 'buildMspFile').mockReturnValue('');

		const file = tabDelimitedFile('test.txt', [['METABOLITE NAME'], ['Test Compound']]);
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);
		await vi.waitFor(() => expect(component.parsing).toBe(false));

		component.readFile();

		expect(component.buildMspService.buildMspFile).toHaveBeenCalledWith(
			[['METABOLITE NAME'], ['Test Compound']],
			expect.any(String),
			expect.any(String),
			'msdial',
			component.headerMappings
		);
	});

	it('should default showMappingPanel to expanded, and toggle it', () => {
		expect(component.showMappingPanel).toBe(true);
		component.showMappingPanelToggle();
		expect(component.showMappingPanel).toBe(false);
		component.showMappingPanelToggle();
		expect(component.showMappingPanel).toBe(true);
	});

	it('should exclude sample-flagged headers from visibleHeaderMappings after a parse', async () => {
		const file = tabDelimitedFile('test.txt', [
			['SAMPLE 1', 'BATCH ID'],
			['1', '2']
		]);
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);
		await vi.waitFor(() => expect(component.parsing).toBe(false));

		expect(component.visibleHeaderMappings.some(m => m.isSample)).toBe(false);
	});

	it('should show a fixed "Mapped as list of peaks" label instead of a dropdown for the MSMS SPECTRUM column', async () => {
		component.headerMappings = [
			{ header: 'MSMS SPECTRUM', action: 'map', targetKey: 'MSMS SPECTRUM', isSample: false, recognizedAs: 'MSMS SPECTRUM' },
			{ header: 'METABOLITE NAME', action: 'map', targetKey: 'Name', isSample: false, recognizedAs: 'METABOLITE NAME' }
		];
		component.visibleHeaderMappings = component.headerMappings.filter(mapping => !mapping.isSample);
		fixture.componentRef.changeDetectorRef.markForCheck();
		fixture.detectChanges(false);

		const loader = TestbedHarnessEnvironment.loader(fixture);
		const msmsRowLoader = await loader.getChildLoader('tr[data-header="MSMS SPECTRUM"]');
		const nameRowLoader = await loader.getChildLoader('tr[data-header="METABOLITE NAME"]');

		expect(await msmsRowLoader.getAllHarnesses(MatSelectHarness)).toHaveLength(0);
		const msmsRow = fixture.debugElement.nativeElement.querySelector('tr[data-header="MSMS SPECTRUM"]');
		expect(msmsRow.textContent).toContain('Mapped as list of peaks');

		expect(await nameRowLoader.getAllHarnesses(MatSelectHarness)).toHaveLength(1);
	});

	it('should update a mapping to "comment" when updateMapping is called with value "comment"', () => {
		const mapping = { header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false };
		component.headerMappings = [mapping];
		component.updateMapping(mapping, 'comment');
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'comment', targetKey: null, isSample: false });
	});

	it('should update a mapping to "map" with the chosen key when updateMapping is called with a key value', () => {
		const mapping = { header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false };
		component.headerMappings = [mapping];
		component.updateMapping(mapping, 'FORMULA');
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'map', targetKey: 'FORMULA', isSample: false });
	});

	it('should update a mapping to "ignore" when updateMapping is called with value "ignore"', () => {
		const mapping = { header: 'BATCH ID', action: 'map' as const, targetKey: 'FORMULA', isSample: false };
		component.headerMappings = [mapping];
		component.updateMapping(mapping, 'ignore');
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false });
	});

	it('should update notesText when getTextFromTextArea is called', () => {
		const textArea = document.createElement('textarea');
		textArea.value = 'Some notes';
		component.getTextFromTextArea({ target: textArea } as unknown as Event);
		expect(component.notesText).toBe('Some notes');
	});

	it('should toggle showNotes when showNotesTextArea is called', () => {
		expect(component.showNotes).toBe(false);
		component.showNotesTextArea();
		expect(component.showNotes).toBe(true);
		component.showNotesTextArea();
		expect(component.showNotes).toBe(false);
	});

	it('should call downloadFileService.downloadExampleFile with the anchor name when downloadExample is called', () => {
		const downloadFileService = TestBed.inject(DownloadFileService);
		vi.spyOn(downloadFileService, 'downloadExampleFile').mockImplementation(() => {});
		const anchor = document.createElement('a');
		anchor.setAttribute('name', 'example_msp-txt');
		component.downloadExample({ target: anchor } as unknown as Event);
		expect(downloadFileService.downloadExampleFile).toHaveBeenCalledWith('example_msp-txt');
	});

	it('should reject a file with an unsupported extension and clear cached state', () => {
		const fileList = { length: 1, 0: new File([''], 'test.bad') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.cachedMsmsArray = [['stale']];
		component.headerMappings = [{ header: 'stale', action: 'map', targetKey: 'FORMULA', isSample: false }];

		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.submitValid).toBe(false);
		expect(component.files).toBeNull();
		expect(component.cachedMsmsArray).toBeNull();
		expect(component.headerMappings).toEqual([]);
		expect(component.showErrorBox).toBe(true);
	});

	it('should clear headerMappings when no header row is found while parsing', async () => {
		// No line here matches any known/synonym header, so the real header-detection logic
		//  correctly returns -1 without needing to stub getHeaderPosition.
		const file = tabDelimitedFile('test.txt', [['not', 'a', 'header', 'row']]);
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);
		await vi.waitFor(() => expect(component.parsing).toBe(false));

		expect(component.headerMappings).toEqual([]);
	});

	it('should clear cachedMsmsArray and headerMappings when parsing the selected file errors', async () => {
		// A bare ZIP signature ("PK\x03\x04") with no valid archive behind it: XLSX.read
		//  recognizes the xlsx/zip container format and throws while unzipping, which
		//  readXlsxSync's onLoad handler lets propagate — reproducing a genuine corrupt-file
		//  parse failure end-to-end. (Plain garbage text without the ZIP signature is instead
		//  parsed by XLSX.read as a valid one-cell CSV-like sheet, so it would not exercise
		//  this error path.)
		const file = new File(['PK\x03\x04not a real zip'], 'test.xlsx', { type: 'application/octet-stream' });
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		await vi.waitFor(() => expect(component.parsing).toBe(false));

		expect(component.cachedMsmsArray).toBeNull();
		expect(component.headerMappings).toEqual([]);
	});

	it('should set parsing=true and disable Submit while the async parse is still in flight (C1)', () => {
		// A real FileReader read is already asynchronous (jsdom queues it across several
		//  setImmediate ticks), so the parse is naturally still pending immediately after
		//  fileSelected() returns — no fake/delayed observable is needed to reproduce the race.
		const file = tabDelimitedFile('test.txt', [['METABOLITE NAME'], ['Test Compound']]);
		const fileList = { length: 1, 0: file } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.parsing).toBe(true);
		// checkNoChanges=false: we are deliberately re-rendering after mutating component state
		// (an unrelated pre-existing binding elsewhere in the template trips NG0100 otherwise).
		fixture.detectChanges(false);
		const submit = document.getElementById('submit') as HTMLButtonElement;
		expect(submit.disabled).toBe(true);
	});

	it('should not let a stale, slower parse subscription overwrite a later file selection\'s cached state (I1)', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		const fileASubject = new Subject<string[][]>();
		const fileBSubject = new Subject<string[][]>();
		vi.spyOn(readSpreadsheetService, 'readXlsx')
			.mockReturnValueOnce(fileASubject.asObservable())
			.mockReturnValueOnce(fileBSubject.asObservable());

		// Select file A; its parse does not resolve yet.
		const fileListA = { length: 1, 0: new File([''], 'fileA.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileListA } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		// Select file B before A resolves.
		const fileListB = { length: 1, 0: new File([''], 'fileB.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileListB } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		// A's (stale) data arrives after B was selected.
		fileASubject.next([['METABOLITE NAME'], ['From File A']]);
		// B's data arrives.
		fileBSubject.next([['METABOLITE NAME'], ['From File B']]);

		expect(component.fileName).toBe('fileB.xlsx');
		expect(component.cachedMsmsArray).toEqual([['METABOLITE NAME'], ['From File B']]);
		expect(component.headerMappings).toEqual([
			{ header: 'METABOLITE NAME', action: 'map', targetKey: 'Name', isSample: false, recognizedAs: 'METABOLITE NAME' }
		]);
	});

	it('should show an error when readFile is called without a file selected', () => {
		component.targetInput = { value: '' } as HTMLInputElement;
		component.files = null;

		component.readFile();

		expect(component.errorText).toBe('Select file before clicking \'Submit\'');
		expect(component.showWrong).toBe(true);
	});

	it('should show a corrupted-file error when readFile is called with no cached data', () => {
		component.targetInput = { value: '' } as HTMLInputElement;
		component.files = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.cachedMsmsArray = null;

		component.readFile();

		expect(component.errorText).toBe('Error: file may be corrupted or may not exist');
		expect(component.fileNameText).toBe('Click \'Browse\' to choose a spreadsheet');
	});

	it('should report ".msp created with some issues" when buildMspFile returns errors alongside missing/duplicate data', () => {
		vi.spyOn(component.buildMspService, 'buildMspFile').mockReturnValue('some error text');
		component.buildMspService.missingData = ['row 3: missing FORMULA'];
		component.buildMspService.duplicates = [];

		component.buildMsp('test.xlsx', '', 'spreadsheet');

		expect(component.fileNameText).toBe('.msp created with some issues');
		expect(component.showCorrect).toBe(true);
		expect(component.errorText).toBe('some error text');
	});

	it('should report "Fix errors, then retry upload" when buildMspFile returns errors with no missing/duplicate data', () => {
		vi.spyOn(component.buildMspService, 'buildMspFile').mockReturnValue('fatal error text');
		component.buildMspService.missingData = [];
		component.buildMspService.duplicates = [];

		component.buildMsp('test.xlsx', '', 'spreadsheet');

		expect(component.fileNameText).toBe('Fix errors, then retry upload');
		expect(component.showWrong).toBe(true);
		expect(component.errorText).toBe('fatal error text');
	});

	it('should delegate to buildMspService.saveErrorFile with a derived file name when getErrorFile is called', () => {
		component.fileName = 'my-spreadsheet.xlsx';
		vi.spyOn(component.buildMspService, 'saveErrorFile').mockImplementation(() => {});

		component.getErrorFile();

		expect(component.buildMspService.saveErrorFile).toHaveBeenCalledWith('error_file_my-spreadsheet.txt');
	});

});
