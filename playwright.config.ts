import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/src',
    testMatch: '**/*.e2e-spec.ts',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4300',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npx ng serve --configuration development --port 4300',
        url: 'http://localhost:4300',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
});
