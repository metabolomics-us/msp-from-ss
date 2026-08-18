import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
	let fixture: ComponentFixture<AppComponent>;
	let component: AppComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [AppComponent, NoopAnimationsModule]
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
