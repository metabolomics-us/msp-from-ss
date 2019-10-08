import { async, ComponentFixture, TestBed } from '@angular/core/testing';

// Doesn't seem to fix problem of Template parse errors
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ReadSpreadsheetComponent } from './read-spreadsheet.component';

fdescribe('ReadSpreadsheetComponent', () => {
	let component: ReadSpreadsheetComponent;
	let fixture: ComponentFixture<ReadSpreadsheetComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
		declarations: [ ReadSpreadsheetComponent ],
		schemas: [CUSTOM_ELEMENTS_SCHEMA]
	})
    .compileComponents();}));

	beforeEach(() => {
        fixture = TestBed.createComponent(ReadSpreadsheetComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have instructions', () => {
        const instructions = document.getElementById('instructions');
        expect(instructions).toBeTruthy();
    });
    
    // Tried expect(anchorElements.length).toEqual(3) one is an anchor tag added by jasmine, 
    it('should have 3 <a>', () => {
        const anchorNames = ['example_spreadsheet_large-xlsx','example_spreadsheet_small-xlsx','example-msp'];
        let anchorElement: HTMLAnchorElement;
        anchorNames.forEach(name => {
            anchorElement = document.getElementsByName(name)[0] as HTMLAnchorElement;
            expect(anchorElement).toBeTruthy();
        });
    });
    
    it('should call downloadExample when user clicks <a>', () => {        
        const anchorNames = ['example_spreadsheet_large-xlsx','example_spreadsheet_small-xlsx','example-msp'];
        spyOn(component, 'downloadExample');
        // let anchorElement = document.getElementsByName("example_spreadsheet_large-xlsx");
        let anchorElement: HTMLAnchorElement;
        anchorNames.forEach(name => {
            anchorElement = document.getElementsByName(name)[0] as HTMLAnchorElement;
            anchorElement.click();
            expect(component.downloadExample).toHaveBeenCalled();
        });
    });

    it('should call fileSelected when change event occurs', () => {
		spyOn(component, 'fileSelected');
		const element = document.getElementById('fileInput');
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
		const element = document.getElementById('fileInput');
		const event = new Event('change');
		element.dispatchEvent(event);
        expect(component.fileSelected).toHaveBeenCalled();
    });

    // this.files exists

});
