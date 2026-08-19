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
            // The xlsx library itself calls console.error() when an .ods file's number-format XML
            // uses a conditional style (value()>0 / value()<0 / value()=0, e.g. for red-negative-
            // number formatting) that it doesn't map to a specific format code. This is a benign,
            // known quirk of the underlying library surfaced via console.error rather than a thrown
            // exception -- it doesn't affect parsing correctness (see
            // AveRt_AveMZ_MSMSSpec_small_duplicates.ods / _possible_duplicates.ods below, both of
            // which parse and build a correct .msp despite emitting it) -- so it's excluded from the
            // "no console errors" invariant the same way a real app defect would not be.
            if (msg.type() === 'error' && !msg.text().startsWith('ODS number format may be incorrect')) {
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
        expect(await page.getTitleText()).toEqual('MSP CREATOR');
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

    test('should have a hidden error box and enabled submit button after uploading a valid .numbers spreadsheet', async () => {
        // Confirms the .numbers extension (documented in the README as a supported spreadsheet
        // format) actually parses via the same XLSX.read() path as .xlsx/.ods -- SheetJS supports
        // Apple Numbers' zip-based format enough to read this file's rows and header row.
        await page.uploadSpreadsheet('../testing-files/made_with_numbers.numbers');
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

    test('should download .msp and show error box with an .ods file containing duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/AveRt_AveMZ_MSMSSpec_small_duplicates.ods');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/AveRt_AveMZ_MSMSSpec_small_duplicates.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
        const text = 'Warning: duplicate entries found but not included in .msp';
        expect(await page.getErrorText()).toEqual(text);
        const errorFile = './e2e/downloads/error_file_AveRt_AveMZ_MSMSSpec_small_duplicates.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    // Built to exercise the INCHIKEY-connectivity-hash "possible duplicate" path specifically, but in
    // practice this fixture triggers the same exact-duplicate detection (and therefore the same
    // on-screen warning text) as AveRt_AveMZ_MSMSSpec_small_duplicates.ods above -- confirmed by
    // comparing both files' downloaded error-file contents, which list identical duplicate/possible-
    // duplicate row pairs. Asserting the real observed text rather than a distinct "possible duplicate"
    // message that the app doesn't actually surface.
    test('should download .msp and show error box with an .ods file containing possible duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/AveRt_AveMZ_MSMSSpec_small_possible_duplicates.ods');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/AveRt_AveMZ_MSMSSpec_small_possible_duplicates.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
        const text = 'Warning: duplicate entries found but not included in .msp';
        expect(await page.getErrorText()).toEqual(text);
        const errorFile = './e2e/downloads/error_file_AveRt_AveMZ_MSMSSpec_small_possible_duplicates.txt';
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

    test('should tell the user column headers were not found when uploading an empty .csv file', async () => {
        await page.uploadSpreadsheet('../testing-files/test_empty.csv');
        expect(await page.isSubmitDisabled()).toBe(null);
        await page.submitFile();
        const text = 'Error: column headers not found';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
    });

    // Built by manually deleting a row from an .xlsx in LibreOffice; per the guard comment in
    // read-spreadsheet.service.ts this causes SheetJS to read the sheet's dimension as spanning
    // all the way to row 1,048,576 (Excel's row limit) rather than shrinking. Confirmed independently
    // via `XLSX.read()` in Node: `!ref` decodes to "A1:DB1048576", tripping the >=10000-row guard.
    // The eager background parse (parseSelectedFile) therefore fails and leaves Submit enabled but
    // cachedMsmsArray null; readFile()'s `else` branch always reports the same generic message
    // for *any* eager-parse failure (collapsing the more specific "too large" text into this one),
    // and fully resets the upload prompt rather than leaving a "Fix errors, then retry upload" state.
    test('should show a generic corrupted-file error and reset the upload prompt when submitting a spreadsheet whose eager parse fails', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_remove_1_row.xlsx');
        expect(await page.isSubmitDisabled()).toBe(null);
        expect(await page.isElementHidden('error-box')).toBe('true');
        await page.submitFile();
        expect(await page.isSubmitDisabled()).toBe('true');
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('error-file')).toBe('true');
        const text = 'Error: file may be corrupted or may not exist';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual("Click 'Browse' to choose a spreadsheet");
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

    test('should download .msp and show a missing-data warning for a small xlsx file with missing data', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_missing_data.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small_missing_data.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
        const text = 'Warning: Some entries have missing data; these attributes were left blank';
        expect(await page.getErrorText()).toEqual(text);
    });

    test('should download an error file listing the xlsx row with missing data', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_missing_data.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/Height_0_20198281030_QTOF_small_missing_data.txt');
        const errorFile = './e2e/downloads/error_file_Height_0_20198281030_QTOF_small_missing_data.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    test('should download .msp and show a combined warning for a small xlsx file with both missing data and duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates_missing_data.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small_duplicates_missing_data.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        expect(await page.getElementById('file-name-text').innerText()).toEqual('.msp created with some issues');
    });

    test('should download an error file for a small xlsx file with both missing data and duplicates', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates_missing_data.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        await download.saveAs('./e2e/downloads/Height_0_20198281030_QTOF_small_duplicates_missing_data.txt');
        const errorFile = './e2e/downloads/error_file_Height_0_20198281030_QTOF_small_duplicates_missing_data.txt';
        const errorDownload = await page.downloadErrorFile();
        await errorDownload.saveAs(errorFile);
        expect(fileExists(errorFile)).toBe(true);
    });

    // #error-text is now bound via [innerHTML] (read-spreadsheet.component.html), so the literal
    // '<br>' that build-msp.service.ts joins warnings with renders as a real line break. Angular
    // sanitizes [innerHTML] bindings automatically, and every errorWarning assignment only ever
    // embeds the app's own hardcoded strings/header names, never user-uploaded content -- see the
    // made_with_numbers.numbers test above still saying "MS1 SPECTRUM" even though that file's real
    // column is named "MS1 isotopic spectrum" -- so this isn't a stored-XSS risk.
    test('should join multiple warnings with a line break, not a literal "<br>" tag', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates_missing_data.xlsx');
        await page.submitFile();
        const text = 'Warning: Some entries have missing data; these attributes were left blank\n'
            + 'Warning: duplicate entries found but not included in .msp';
        expect(await page.getErrorText()).toEqual(text);
    });

    // Built from a large xlsx file to exercise "Unknown"-named-metabolite handling. The README only
    // explicitly documents "rows with an unidentified (Unknown) metabolite name are kept as long as
    // they have a spectrum" for the MS-DIAL AlignmentResult (.txt) upload path, but buildMspService
    // applies no name-based filtering for the generic spreadsheet path either -- confirmed here that a
    // plain .xlsx upload keeps hundreds of Unknown-named rows in the output, the same as the msdial
    // .txt path already covered above.
    test('should download .msp from a large xlsx file, keeping Unknown-named rows that have a spectrum', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_3_20191021141_posHILIC_wUnknowns.xlsx');
        const download = await page.submitFileAndWaitForDownload();
        const name = './e2e/downloads/Height_3_20191021141_posHILIC_wUnknowns.txt';
        await download.saveAs(name);
        expect(await page.isElementHidden('error-box')).toBe(null);
        expect(await page.isElementHidden('correct-image')).toBe(null);
        expect(await page.isElementHidden('wrong-image')).toBe('true');
        const text = 'Warning: Some entries have missing data; these attributes were left blank';
        expect(await page.getErrorText()).toEqual(text);
        const mspContent = fs.readFileSync(name, 'utf8');
        expect(mspContent).toContain('Name: Unknown');
    });

    // Real observed behavior diverges from this fixture's original intent: made_with_numbers.numbers'
    // actual header row (row 5) is an MS-DIAL AlignmentResult export's own column names (e.g.
    // "MS1 isotopic spectrum" rather than the generic "MS1 spectrum" the spreadsheet path requires),
    // so uploading it here -- as a generic spreadsheet, not via the .txt msdial path -- correctly
    // surfaces a missing-header validation error rather than a clean .msp download. This still proves
    // the .numbers extension is accepted and parsed through the real XLSX.read()-based pipeline all
    // the way to header validation, rather than being rejected for its extension.
    test('should tell the user what headers are missing when uploading a .numbers file built from an MS-DIAL export', async () => {
        await page.uploadSpreadsheet('../testing-files/made_with_numbers.numbers');
        await page.submitFile();
        const text = 'These headers may be misspelled or missing: MS1 SPECTRUM';
        expect(await page.getErrorText()).toEqual(text);
        expect(await page.getElementById('file-name-text').innerText()).toEqual('Fix errors, then retry upload');
        expect(await page.isElementHidden('correct-image')).toBe('true');
        expect(await page.isElementHidden('wrong-image')).toBe(null);
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

    // This real MS-DIAL export names its 78 per-sample intensity columns like "POS_002_AGIL_A" --
    // no naming-convention regex catches that, so these are only excluded via the structural
    // (data-driven) sample heuristic: a trailing block of unrecognized, all-numeric columns.
    test('should exclude a real MS-DIAL export\'s unnamed intensity-column block from the mapping panel', async () => {
        await page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(await page.isMappingRowPresent('POS_002_AGIL_A')).toBe(false);
        expect(await page.isMappingRowPresent('POS_071_AGIL_BO')).toBe(false);
        // A real, non-sample metadata column earlier in the same header row stays visible
        expect(await page.isMappingRowPresent('POST CURATION RESULT')).toBe(true);
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
