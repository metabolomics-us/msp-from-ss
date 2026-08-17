import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component';
import { MatToolbarModule } from '@angular/material/toolbar';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('AppComponent', () => {
	let fixture: ComponentFixture<AppComponent>;
	let component: AppComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule, MatToolbarModule
			],
			declarations: [
				AppComponent, ReadSpreadsheetComponent
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(AppComponent);
		component = fixture.debugElement.componentInstance;
	});

	it('should create the app', () => {
		expect(component).toBeTruthy();
	});
});
