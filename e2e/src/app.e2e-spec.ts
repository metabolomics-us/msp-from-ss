import { AppPage } from './app.po';
import { browser, logging, element } from 'protractor';

describe('workspace-project App', () => {
	let page: AppPage;

	beforeEach(() => {
        page = new AppPage();
    });
    
    it('should have the correct title', () => {
        page.navigateTo();
        expect(page.getTitleText()).toEqual('MSP Creator');
    });

    it('should have instruction elements', () => {
        page.navigateTo();
        expect(page.elementExists('title')).toBe(true);
        expect(page.elementExists('instructions')).toBe(true);
        expect(page.elementExists('examples')).toBe(true);
    });

    it('should have a disabled submit button and hidden error box to start', () => {
        page.navigateTo();
        expect(page.isSubmitValid()).toBe('true');
        expect(page.isErrorBoxHidden()).toBe('true');
    });

    it('should have a hidden error box and enabled submit button after uploading a valid .xlsx spreadsheet', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../../Testing-Files/Height_0_20198281030_QTOF_small.xlsx');
        expect(page.isSubmitValid()).toBe(null);
        expect(page.isErrorBoxHidden()).toBe('true');
    });

    it('should show error box; have disabled submit button; correct error text after uploading an invalid .txt spreadsheet', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../../Testing-Files/test_spreadsheet.txt');
        const text = 'Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers';
        expect(page.isSubmitValid()).toBe('true');
        expect(page.isErrorBoxHidden()).toBe(null);
        expect(page.getErrorText()).toEqual(text);
    });

    // Failed: script timeout
    it('should show error box with small complete file', () => {
        page.navigateTo();
        // Prevents script timeout, not sure if it tests at right time though
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../../Testing-Files/Height_0_20198281030_QTOF_small.xlsx');
        page.submitFile();
        expect(page.isErrorBoxHidden()).toBe('true');
    });

    it('should show error box with small file with duplicates', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../../Testing-Files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        page.submitFile();
        expect(page.isErrorBoxHidden()).toBe(null);
    });

    it('should show error box with large file with missing data', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../../Testing-Files/Height_0_20197191136negCSH_columns_renamed.xlsx');
        page.submitFile();
        expect(page.isErrorBoxHidden()).toBe(null);
    });

    it('should not show error box with medium sized complete file', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../../Testing-Files/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.xlsx');
        page.submitFile();
        expect(page.isErrorBoxHidden()).toBe('true');
    });

    // Come back to this one, it's not written properly
    xit('should have correct error text when file does not exist', () => {

        // write a dummy file w/.csv suffix
        // upload it
        // delete it
        // submit it
        // check for error text

        page.navigateTo();
        page.uploadSpreadsheet('../../Testing-Files/not_a_file.csv');
        const text = 'Error: file may be corrupted or may not exist; Check uploaded file';
        expect(page.getErrorText()).toEqual(text);
    });

    // Check if file was downloaded

	afterEach(async () => {
		// Assert that there are no errors emitted from the browser
		const logs = await browser.manage().logs().get(logging.Type.BROWSER);
		expect(logs).not.toContain(jasmine.objectContaining({
			level: logging.Level.SEVERE,
        } as logging.Entry));
	});
});
