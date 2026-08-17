import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
	let service: ThemeService;

	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute('data-theme');
		TestBed.configureTestingModule({ providers: [ThemeService] });
		service = TestBed.inject(ThemeService);
	});

	afterEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute('data-theme');
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should default to light (data-theme absent) when no stored preference and system prefers light', () => {
		vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
		service.initTheme();
		expect(service.isDark).toBe(false);
		expect(document.documentElement.getAttribute('data-theme')).toBeNull();
	});

	it('should default to dark when no stored preference and system prefers dark', () => {
		vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
		service.initTheme();
		expect(service.isDark).toBe(true);
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});

	it('should prefer a stored preference over the system default', () => {
		localStorage.setItem('msp-theme', 'dark');
		vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
		service.initTheme();
		expect(service.isDark).toBe(true);
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});

	it('should default to light when matchMedia is unavailable', () => {
		vi.spyOn(window, 'matchMedia' as any).mockReturnValue(undefined);
		service.initTheme();
		expect(service.isDark).toBe(false);
	});

	it('should toggle from light to dark and persist the choice', () => {
		vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
		service.initTheme();
		service.toggle();
		expect(service.isDark).toBe(true);
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		expect(localStorage.getItem('msp-theme')).toBe('dark');
	});

	it('should toggle from dark back to light and persist the choice', () => {
		localStorage.setItem('msp-theme', 'dark');
		vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
		service.initTheme();
		service.toggle();
		expect(service.isDark).toBe(false);
		expect(document.documentElement.getAttribute('data-theme')).toBeNull();
		expect(localStorage.getItem('msp-theme')).toBe('light');
	});
});
