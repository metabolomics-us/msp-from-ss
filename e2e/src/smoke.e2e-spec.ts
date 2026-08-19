import { test, expect } from '@playwright/test';

test.describe('production smoke test', () => {
	test('the app boots and renders with no console errors', async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on('console', msg => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});
		page.on('pageerror', err => consoleErrors.push(err.message));

		await page.goto('/');

		await expect(page.locator('.app-navbar__brand')).toHaveText('MSP Creator');
		await expect(page.locator('#file-input')).toBeAttached();
		await expect(page.locator('#submit')).toBeAttached();
		expect(consoleErrors).toEqual([]);
	});
});
