import { test, expect } from '@playwright/test';
import { AppPage, deleteDownloads, fileExists } from './app.po';
import * as fs from 'fs';

test.describe.configure({ mode: 'serial' });

test.describe('workspace-project App', () => {
    let page: AppPage;
    const consoleErrors: string[] = [];

    test.beforeAll(() => {
        deleteDownloads();
    });

    test.beforeEach(async ({ page: rawPage }) => {
        consoleErrors.length = 0;
        rawPage.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        rawPage.on('pageerror', err => {
            consoleErrors.push(err.message);
        });
        page = new AppPage(rawPage);
        await page.navigateTo();
    });

    test.afterEach(() => {
        expect(consoleErrors).toEqual([]);
    });

    test.afterAll(() => {
        deleteDownloads();
    });

    test('should have instruction elements', async () => {
        expect(await page.elementExists('instructions')).toBe(true);
        expect(await page.elementExists('examples')).toBe(true);
        expect(await page.elementExists('file-name-text')).toBe(true);
        expect(await page.getTitleText()).toEqual('MSP Creator');
    });

    test('should have interaction elements', async () => {
        expect(await page.elementExists('rs-buttons')).toBe(true);
        expect(await page.elementExists('file-input')).toBe(true);
        expect(await page.elementExists('submit')).toBe(true);
    });

    test('should have correctly disabled and hidden elements to start', async () => {
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should have a hidden error box and enabled submit button after uploading a valid .xlsx spreadsheet', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should have button and error box states change when uploading valid and then invalid files', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
    });

    test('should have button and error box states change when uploading invalid and then valid files', async () => {
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should have disabled submit button, correct error text with an unsupported file extension', async () => {
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
        const text = 'Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers, .txt';
        expect(await page.getErrorText()).toEqual(text);
    });

    test('should not show error file button when uploading wrong file type', async () => {
        await page.uploadSpreadsheet('../testing-files/test_invalid_extension.rtf');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('error-file')).toBe('true');
    });

    test('should download .msp with small complete file', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created');
    });

    test('should download .msp and show error box with small file with duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small_duplicates.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
        const errorFile = './e2e/downloads/error_file_Height_0_20198281030_QTOF_small_duplicates.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should download .msp cleanly from a large file with renamed/case-varied headers', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH_columns_renamed.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20197191136negCSH_columns_renamed.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created');
    });

    test('should download error file when submitting small file with duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/Height_0_20198281030_QTOF_small_duplicates.txt');
        const errorFile = './e2e/downloads/error_file_Height_0_20198281030_QTOF_small_duplicates.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should NOT show error box with medium sized complete file', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe('true');
    });

    test('should still parse a selected file correctly after the underlying file is deleted from disk', async () => {
        const BOM = '﻿';
        const testData = BOM + 'test,data\ntest,data';
        const dummyPath = './e2e/testing-files/not_a_file.csv';
        fs.writeFileSync(dummyPath, testData);
        await page.uploadSpreadsheet('../testing-files/not_a_file.csv');
        fs.unlinkSync(dummyPath);
        await page.submitFile();
        expect(await page.isElementHidden('error-box')).toBe(null);
        const text = 'Error: column headers not found';
        expect(await page.getErrorText()).toEqual(text);
    });

    test('should tell the user that headers are not found', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_no_headers.ods');
        await page.submitFile();
        const text = 'Error: column headers not found';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
    });

    test('should tell the user what headers are missing', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH.xlsx');
        await page.submitFile();
        const text = 'These headers may be misspelled or missing: Precursor_type';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
    });

    test('should tell the user headers are not found when uploading a comma-delimited .txt file', async () => {
        await page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');
        expect(await page.isSubmitDisabled()).toBe(null);
        await page.submitFile();
        const text = 'Error: column headers not found';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
    });

    test('should have a hidden error box and enabled submit button after uploading a valid MS-DIAL AlignmentResult .txt file', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
    });

    test('should download .msp from a MS-DIAL AlignmentResult .txt file, keeping the Unknown-but-spectrum row and dropping the no-spectrum row', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/msdial_alignment_result_small.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        const text = 'Warning: Some entries have missing data; these attributes were left blank';
        expect(await page.getErrorText()).toEqual(text);
        const mspContent = fs.readFileSync(name, 'utf8');
        expect(mspContent).toContain('Name: 1-Methyltryptophan');
        expect(mspContent).toContain('Name: Unknown');
        expect(mspContent).not.toContain('ShouldBeFiltered');
    });

    test('should download an error file listing the msdial row with missing data', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_small.txt');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/msdial_alignment_result_small.txt');
        const errorFile = './e2e/downloads/error_file_msdial_alignment_result_small.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should show the mapping panel expanded by default, collapsible via the toggle button', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        expect(await page.elementExists('show-mapping-button')).toBe(true);
        expect(await page.isMappingPanelHidden()).toBe(null);
        await page.toggleMappingPanel();
        expect(await page.isMappingPanelHidden()).toBe('true');
    });

    test('should exclude a Sample N style column from the mapping panel', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        expect(await page.isMappingRowPresent('SAMPLE 1')).toBe(false);
        expect(await page.isMappingRowPresent('NOTES')).toBe(true);
    });

    test('should include a user-added MSP Comment from an unmatched column after a mapping override', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        await page.selectMappingOption('NOTES', 'Add as comment');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/msdial_alignment_result_with_extra_column_override.txt';
        await download.saveAs(name);
        const mspContent = fs.readFileSync(name, 'utf8');
        // Shares the Comments line with the auto-classified AVERAGE RT(MIN) sub-field (RT=)
        expect(mspContent).toContain('NOTES: Interesting peak');
    });

    test('should still download an unmodified .msp when the mapping panel is left untouched', async () => {
        await page.uploadSpreadsheet('../testing-files/msdial_alignment_result_with_extra_column.txt');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/msdial_alignment_result_with_extra_column_untouched.txt';
        await download.saveAs(name);
        const mspContent = fs.readFileSync(name, 'utf8');
        expect(mspContent).toContain('Name: 1-Methyltryptophan');
        // AVERAGE RT(MIN) still auto-classifies to its own Comments sub-field (RT=), but NOTES
        //  wasn't opted in, so only RT= should appear on the Comments line, not the NOTES text.
        expect(mspContent).toContain('Comments: RT=');
        expect(mspContent).not.toContain('NOTES');
        expect(mspContent).not.toContain('Interesting peak');
    });
});
