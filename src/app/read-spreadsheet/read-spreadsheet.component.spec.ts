import { async, ComponentFixture, TestBed } from '@angular/core/testing';
// Doesn't seem to fix problem of Template parse errors
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
// import { FormsModule } from '@angular/forms';
import { BuildMspService } from '../build-msp-service/build-msp.service';
import { ReadSpreadsheetService } from '../read-spreadsheet-service/read-spreadsheet.service';
import * as path from 'path';
import { Observable } from 'rxjs';

describe('ReadSpreadsheetComponent', () => {
	let component: ReadSpreadsheetComponent;
	let fixture: ComponentFixture<ReadSpreadsheetComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
        declarations: [ ReadSpreadsheetComponent ],
        // imports: [FormsModule],
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

});
