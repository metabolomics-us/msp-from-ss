import { Injectable } from '@angular/core';

const STORAGE_KEY = 'msp-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {

	isDark = false;

	initTheme(): void {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'dark' || stored === 'light') {
			this.isDark = stored === 'dark';
		} else {
			this.isDark = this.prefersDark();
		}
		this.apply();
	}

	toggle(): void {
		this.isDark = !this.isDark;
		localStorage.setItem(STORAGE_KEY, this.isDark ? 'dark' : 'light');
		this.apply();
	}

	private prefersDark(): boolean {
		if (typeof window.matchMedia !== 'function') {
			return false;
		}
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		return !!query && query.matches;
	}

	private apply(): void {
		if (this.isDark) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}
}
