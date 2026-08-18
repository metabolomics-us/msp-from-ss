import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { MatToolbarModule } from '@angular/material/toolbar';

// Stub for ReadSpreadsheetComponent: the real component's template binds
// `mat-table` directives (`dataSource`, `matHeaderRowDef`,
// `matRowDefColumns`) that don't resolve without its full module
// dependency tree, producing NG0303 console errors in every test that
// merely renders AppComponent's shell. This stub keeps the
// `<read-spreadsheet>` tag in AppComponent's template resolvable without
// pulling in that dependency tree.
@Component({
	selector: 'read-spreadsheet',
	template: '',
	standalone: false
})
class ReadSpreadsheetStubComponent {}

describe('AppComponent', () => {
	let fixture: ComponentFixture<AppComponent>;
	let component: AppComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule, MatToolbarModule
			],
			declarations: [
				AppComponent, ReadSpreadsheetStubComponent
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(AppComponent);
		component = fixture.debugElement.componentInstance;
		fixture.detectChanges();
	});

	it('should create the app', () => {
		expect(component).toBeTruthy();
	});

	it('should render the migrated navbar', () => {
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.querySelector('mat-toolbar.app-navbar')).toBeTruthy();
		expect(compiled.querySelector('.app-navbar__brand')?.textContent?.trim())
			.toBe('MSP Creator');
	});
});
