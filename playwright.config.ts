import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/src',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4200',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm start',
        url: 'http://localhost:4200',
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
