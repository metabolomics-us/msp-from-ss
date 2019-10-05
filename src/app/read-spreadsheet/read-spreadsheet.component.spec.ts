import { async, ComponentFixture, TestBed } from '@angular/core/testing';

// Doesn't seem to fix problem of Template parse errors
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ReadSpreadsheetComponent } from './read-spreadsheet.component';
import { link } from 'fs';

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

	// it('should register click', () => {
    //     const element = document.getElementById('exampleLarge');
    //     jasmine.createSpy('HTML Element').and.returnValue(element);
    //     element.click();
	// });

	it('should call fileSelected when file is chosen', () => {
		spyOn(component, 'fileSelected');
		const element = document.getElementById('fileInput');
		const event = new Event('change');
		element.dispatchEvent(event);
        expect(component.fileSelected).toHaveBeenCalled();
	});



});
