import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { ReadSpreadsheetComponent } from './read-spreadsheet/read-spreadsheet.component';
import { ThemeService } from './theme-service/theme.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('AppComponent', () => {
	let fixture: ComponentFixture<AppComponent>;
	let component: AppComponent;
	let themeService: ThemeService;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule, MatToolbarModule, MatButtonModule, MatIconModule, NoopAnimationsModule
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
		themeService = TestBed.inject(ThemeService);
	});

	it('should create the app', () => {
		expect(component).toBeTruthy();
	});

	it('should call themeService.initTheme on init', () => {
		vi.spyOn(themeService, 'initTheme');
		fixture.detectChanges();
		expect(themeService.initTheme).toHaveBeenCalled();
	});

	it('should call themeService.toggle when the theme toggle button is clicked', () => {
		fixture.detectChanges();
		vi.spyOn(themeService, 'toggle');
		const toggleButton = fixture.debugElement.nativeElement.querySelector('#theme-toggle-button') as HTMLButtonElement;
		toggleButton.click();
		expect(themeService.toggle).toHaveBeenCalled();
	});
});
