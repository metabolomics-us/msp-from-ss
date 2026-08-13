import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// Doesn't seem to fix problem of Template parse errors
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
import { BuildMspService } from '../build-msp-service/build-msp.service';
import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import * as path from 'path';
import { Observable, of, throwError, Subject } from 'rxjs';

describe('ReadSpreadsheetComponent', () => {
	let component: ReadSpreadsheetComponent;
	let fixture: ComponentFixture<ReadSpreadsheetComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
        declarations: [ ReadSpreadsheetComponent ],
        imports: [CommonModule, FormsModule],
		schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
		spyOn(component, 'downloadExample');
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
		spyOn(component, 'fileSelected');
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
		spyOn(component, 'fileSelected');
        const element = document.getElementById('file-input');
        const event = new Event('change');
        element.dispatchEvent(event);
		expect(component.fileSelected).toHaveBeenCalled();
    });

	// Look at:
	// https://stackoverflow.com/questions/52078853/is-it-possible-to-update-filelist

	it('should eagerly parse the file and populate headerMappings on a valid file selection', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([
			['AVERAGE RT(MIN)', 'BATCH ID'],
			['6.23', '3']
		]));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.cachedMsmsArray).toEqual([['AVERAGE RT(MIN)', 'BATCH ID'], ['6.23', '3']]);
		expect(component.headerMappings).toEqual([
			{ header: 'AVERAGE RT(MIN)', action: 'map', targetKey: 'AVERAGE RT(MIN)', isSample: false },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		]);
	});

	it('should pass the cached array and headerMappings to buildMspFile on submit, without re-reading the file', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		const readSpy = spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([
			['METABOLITE NAME'], ['Test Compound']
		]));
		spyOn(component.buildMspService, 'buildMspFile').and.returnValue('');

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);
		component.readFile();

		expect(readSpy).toHaveBeenCalledTimes(1);
		expect(component.buildMspService.buildMspFile).toHaveBeenCalledWith(
			[['METABOLITE NAME'], ['Test Compound']],
			jasmine.any(String),
			jasmine.any(String),
			'spreadsheet',
			component.headerMappings
		);
	});

	it('should toggle showMappingPanel', () => {
		expect(component.showMappingPanel).toBe(false);
		component.showMappingPanelToggle();
		expect(component.showMappingPanel).toBe(true);
		component.showMappingPanelToggle();
		expect(component.showMappingPanel).toBe(false);
	});

	it('should exclude sample-flagged headers from visibleHeaderMappings', () => {
		component.headerMappings = [
			{ header: 'SAMPLE 1', action: 'ignore', targetKey: null, isSample: true },
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		];
		expect(component.visibleHeaderMappings).toEqual([
			{ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false }
		]);
	});

	it('should update a mapping to "comment" when updateMapping is called with value "comment"', () => {
		const mapping = { header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false };
		component.headerMappings = [mapping];
		const select = document.createElement('select');
		// A bare <select> with no matching <option> silently ignores a .value assignment
		// (the browser resets it to ''), so add the option the real template would render.
		select.appendChild(new Option('Add as comment', 'comment'));
		select.value = 'comment';
		component.updateMapping(mapping, { target: select } as unknown as Event);
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'comment', targetKey: null, isSample: false });
	});

	it('should update a mapping to "map" with the chosen key when updateMapping is called with a key value', () => {
		const mapping = { header: 'BATCH ID', action: 'ignore' as const, targetKey: null, isSample: false };
		component.headerMappings = [mapping];
		const select = document.createElement('select');
		// See note above: a matching <option> is required for the .value assignment to take effect.
		select.appendChild(new Option('FORMULA', 'FORMULA'));
		select.value = 'FORMULA';
		component.updateMapping(mapping, { target: select } as unknown as Event);
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'map', targetKey: 'FORMULA', isSample: false });
	});

	it('should update a mapping to "ignore" when updateMapping is called with value "ignore"', () => {
		const mapping = { header: 'BATCH ID', action: 'map' as const, targetKey: 'FORMULA', isSample: false };
		component.headerMappings = [mapping];
		const select = document.createElement('select');
		select.appendChild(new Option('Ignore', 'ignore'));
		select.value = 'ignore';
		component.updateMapping(mapping, { target: select } as unknown as Event);
		expect(component.headerMappings[0]).toEqual({ header: 'BATCH ID', action: 'ignore', targetKey: null, isSample: false });
	});

	it('should update notesText when getTextFromTextArea is called', () => {
		const textArea = document.createElement('textarea');
		textArea.value = 'Some notes';
		component.getTextFromTextArea({ srcElement: textArea } as unknown as Event);
		expect(component.notesText).toBe('Some notes');
	});

	it('should toggle showNotes when showNotesTextArea is called', () => {
		expect(component.showNotes).toBe(false);
		component.showNotesTextArea();
		expect(component.showNotes).toBe(true);
		component.showNotesTextArea();
		expect(component.showNotes).toBe(false);
	});

	it('should call downloadFileService.downloadFile with the mapped file name when downloadExample is called', () => {
		// downloadFileService is provided at the component level (see the component's `providers`
		// array), so grab the exact instance this component instance holds rather than TestBed.inject.
		const downloadFileService = (component as unknown as { downloadFileService: { downloadFile: (dir: string, name: string) => void } }).downloadFileService;
		spyOn(downloadFileService, 'downloadFile');
		const anchor = document.createElement('a');
		anchor.setAttribute('name', 'example_msp-txt');
		component.downloadExample({ target: anchor } as unknown as Event);
		expect(downloadFileService.downloadFile).toHaveBeenCalledWith('../assets/files-to-read/', 'example_msp.txt');
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

	it('should clear headerMappings when no header row is found while parsing', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(of([['not', 'a', 'header', 'row']]));
		spyOn(component.buildMspService, 'getHeaderPosition').and.returnValue(-1);

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.headerMappings).toEqual([]);
	});

	it('should clear cachedMsmsArray and headerMappings when parsing the selected file errors', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(throwError(() => new Error('boom')));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
		component.targetInput = { files: fileList } as HTMLInputElement;
		component.fileSelected({ target: component.targetInput } as unknown as Event);

		expect(component.cachedMsmsArray).toBeNull();
		expect(component.headerMappings).toEqual([]);
	});

	it('should set parsing=true and disable Submit while the async parse is still in flight (C1)', () => {
		const readSpreadsheetService: ReadSpreadsheetService = TestBed.inject(ReadSpreadsheetService);
		// Emits asynchronously (setTimeout), unlike of() which emits synchronously and would not
		// reproduce the race: the parse must still be pending immediately after fileSelected() returns.
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValue(new Observable<string[][]>(subscriber => {
			setTimeout(() => {
				subscriber.next([['METABOLITE NAME'], ['Test Compound']]);
				subscriber.complete();
			}, 10);
		}));

		const fileList = { length: 1, 0: new File([''], 'test.xlsx') } as unknown as FileList;
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
		spyOn(readSpreadsheetService, 'readXlsx').and.returnValues(
			fileASubject.asObservable(),
			fileBSubject.asObservable()
		);

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
			{ header: 'METABOLITE NAME', action: 'map', targetKey: 'METABOLITE NAME', isSample: false }
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
		spyOn(component.buildMspService, 'buildMspFile').and.returnValue('some error text');
		component.buildMspService.missingData = ['row 3: missing FORMULA'];
		component.buildMspService.duplicates = [];

		component.buildMsp('test.xlsx', '', 'spreadsheet');

		expect(component.fileNameText).toBe('.msp created with some issues');
		expect(component.showCorrect).toBe(true);
		expect(component.errorText).toBe('some error text');
	});

	it('should report "Fix errors, then retry upload" when buildMspFile returns errors with no missing/duplicate data', () => {
		spyOn(component.buildMspService, 'buildMspFile').and.returnValue('fatal error text');
		component.buildMspService.missingData = [];
		component.buildMspService.duplicates = [];

		component.buildMsp('test.xlsx', '', 'spreadsheet');

		expect(component.fileNameText).toBe('Fix errors, then retry upload');
		expect(component.showWrong).toBe(true);
		expect(component.errorText).toBe('fatal error text');
	});

	it('should delegate to buildMspService.saveErrorFile with a derived file name when getErrorFile is called', () => {
		component.fileName = 'my-spreadsheet.xlsx';
		spyOn(component.buildMspService, 'saveErrorFile');

		component.getErrorFile();

		expect(component.buildMspService.saveErrorFile).toHaveBeenCalledWith('error_file_my-spreadsheet.txt');
	});

});
