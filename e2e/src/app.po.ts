import { Page, Download } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export function deleteDownloads() {
    let files: string[];
    let filePath: string;
    const dirPath = './e2e/downloads';
    try {
        files = fs.readdirSync(dirPath);
    } catch (e) {
        return;
    }
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    }
    fs.rmdirSync(dirPath);
}

export function fileExists(name: string): boolean {
    return fs.existsSync(name);
}

export class AppPage {
    constructor(private page: Page) {}

    async navigateTo() {
        await this.page.goto('/');
    }

    async getTitleText(): Promise<string> {
        return this.page.locator('.app-navbar__brand').innerText();
    }

    getElementById(identifier: string) {
        return this.page.locator('#' + identifier);
    }

    async elementExists(identifier: string): Promise<boolean> {
        return (await this.page.locator('#' + identifier).count()) > 0;
    }

    async isElementHidden(identifier: string): Promise<string | null> {
        // Protractor/Selenium's getAttribute('hidden') normalized a hidden boolean
        // property to the string 'true'; Playwright's plain-DOM getAttribute returns
        // '' for a hidden element. Normalize here so every existing call-site
        // assertion (.toBe('true') / .toBe(null)) keeps working unchanged.
        const attr = await this.page.locator('#' + identifier).getAttribute('hidden');
        return attr !== null ? 'true' : null;
    }

    async uploadSpreadsheet(fileName: string) {
        const absolutePath = path.resolve(__dirname, fileName);
        await this.page.locator('input[type="file"]').setInputFiles(absolutePath);
        // Selecting a file with a supported extension kicks off an async client-side parse
        // (used to pre-populate the header-mapping panel) that briefly disables #submit while
        // in flight via a *ngIf="parsing" overlay (#loading-overlay). Wait for it to detach
        // before returning; if parsing never started or already finished, it's already absent
        // and this resolves immediately.
        await this.page.locator('#loading-overlay').waitFor({ state: 'detached' });
    }

    async isSubmitDisabled(): Promise<string | null> {
        const attr = await this.page.locator('#submit').getAttribute('disabled');
        return attr !== null ? 'true' : null;
    }

    async submitFile() {
        await this.page.locator('#submit').click();
    }

    async submitFileAndWaitForDownload(): Promise<Download> {
        const [download] = await Promise.all([
            this.page.waitForEvent('download'),
            this.page.locator('#submit').click(),
        ]);
        return download;
    }

    async getErrorText(): Promise<string> {
        return this.page.locator('#error-text').innerText();
    }

    async downloadErrorFile(): Promise<Download> {
        const [download] = await Promise.all([
            this.page.waitForEvent('download'),
            this.page.locator('#get-error-file').click(),
        ]);
        return download;
    }

    async toggleMappingPanel() {
        await this.page.locator('#show-mapping-button').click();
    }

    async isMappingPanelHidden(): Promise<string | null> {
        const attr = await this.page.locator('#mapping-table').getAttribute('hidden');
        return attr !== null ? 'true' : null;
    }

    async isMappingRowPresent(header: string): Promise<boolean> {
        return (await this.page.locator(`tr[data-header="${header}"]`).count()) > 0;
    }

    async selectMappingOption(header: string, optionText: string) {
        await this.page.locator(`tr[data-header="${header}"] mat-select`).click();
        await this.page.locator('.cdk-overlay-pane mat-option', { hasText: optionText }).click();
    }

    async getMappingOptionTexts(header: string): Promise<string[]> {
        await this.page.locator(`tr[data-header="${header}"] mat-select`).click();
        const texts = await this.page.locator('.cdk-overlay-pane mat-option').allInnerTexts();
        await this.page.keyboard.press('Escape');
        return texts;
    }

    async getMappingSelectedText(header: string): Promise<string> {
        return this.page.locator(`tr[data-header="${header}"] mat-select .mat-mdc-select-value-text`).innerText();
    }
}
