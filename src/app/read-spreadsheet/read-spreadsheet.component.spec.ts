import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// Doesn't seem to fix problem of Template parse errors
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
import { BuildMspService } from '../build-msp-service/build-msp.service';
import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import * as path from 'path';
import { Observable, of, throwError } from 'rxjs';

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

});
