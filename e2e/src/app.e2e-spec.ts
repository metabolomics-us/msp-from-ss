import { AppPage } from './app.po';
import { browser, logging, element } from 'protractor';
import * as fs from 'fs';
import { saveAs } from 'file-saver';

describe('workspace-project App', () => {
    let page: AppPage;
    
    beforeAll(() => {
        let files: string[];
        let filePath: string;
        const dirPath = './e2e/downloads';
        try {
            files = fs.readdirSync(dirPath);
        } catch(e) {
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
    });

	beforeEach(() => {
        page = new AppPage();
    });

    it('should have instruction elements', () => {
        page.navigateTo();
        expect(page.elementExists('title')).toBe(true);
        expect(page.elementExists('instructions')).toBe(true);
        expect(page.elementExists('examples')).toBe(true);
        expect(page.elementExists('file-name-text')).toBe(true);
        expect(page.getTitleText()).toEqual('MSP Creator');
    });

    it('should have interaction elements', () => {
        page.navigateTo();
        expect(page.elementExists('rs-buttons')).toBe(true);
        expect(page.elementExists('file-input')).toBe(true);
        expect(page.elementExists('submit')).toBe(true);
    });

    it('should have correctly disabled and hidden elements to start', () => {
        page.navigateTo();
        expect(page.isSubmitDisabled()).toBe('true');
        expect(page.isErrorBoxHidden()).toBe('true');
        expect(page.isCorrectImageHidden()).toBe('true');
        expect(page.isWrongImageHidden()).toBe('true');
    });

    it('should have a hidden error box and enabled submit button after uploading a valid .xlsx spreadsheet', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(page.isSubmitDisabled()).toBe(null);
        expect(page.isErrorBoxHidden()).toBe('true');
        expect(page.isCorrectImageHidden()).toBe(null);
        expect(page.isWrongImageHidden()).toBe('true');
    });

    it('should have button and error box states change when uploading valid and then invalid files', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(page.isSubmitDisabled()).toBe(null);
        expect(page.isErrorBoxHidden()).toBe('true');
        expect(page.isCorrectImageHidden()).toBe(null);
        expect(page.isWrongImageHidden()).toBe('true');
        page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');
        expect(page.isSubmitDisabled()).toBe('true');
        expect(page.isErrorBoxHidden()).toBe(null);
        expect(page.isCorrectImageHidden()).toBe('true');
        expect(page.isWrongImageHidden()).toBe(null);
    });

    it('should have button and error box states change when uploading invalid and then valid files', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');
        expect(page.isSubmitDisabled()).toBe('true');
        expect(page.isErrorBoxHidden()).toBe(null);
        expect(page.isCorrectImageHidden()).toBe('true');
        expect(page.isWrongImageHidden()).toBe(null);
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        expect(page.isSubmitDisabled()).toBe(null);
        expect(page.isErrorBoxHidden()).toBe('true');
        expect(page.isCorrectImageHidden()).toBe(null);
        expect(page.isWrongImageHidden()).toBe('true');
    });

    it('should show error box; have disabled submit button; correct error text after uploading an invalid .txt spreadsheet', () => {
        page.navigateTo();
        page.uploadSpreadsheet('../testing-files/test_spreadsheet.txt');
        expect(page.isSubmitDisabled()).toBe('true');
        expect(page.isErrorBoxHidden()).toBe(null);
        expect(page.isCorrectImageHidden()).toBe('true');
        expect(page.isWrongImageHidden()).toBe(null);
        const text = 'Please choose a file with one of these extensions: .xlsx, .xls, .csv, .ods, .numbers';
        expect(page.getErrorText()).toEqual(text);
    });

    it('should download .msp with small complete file', () => {
        page.navigateTo();
        // Prevents script timeout, not sure if it tests at right time though
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small.xlsx');
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                expect(page.isErrorBoxHidden()).toBe('true');
                expect(page.isCorrectImageHidden()).toBe(null);
                expect(page.isWrongImageHidden()).toBe('true');
                expect(page.getElementById('file-name-text').getText()).toEqual('.msp created')
            });
        });
    });

    it('should download .msp and show error box with small file with duplicates', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        const name = './e2e/downloads/Height_0_20198281030_QTOF_small_duplicates.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                expect(page.isErrorBoxHidden()).toBe(null);
                expect(page.isCorrectImageHidden()).toBe(null);
                expect(page.isWrongImageHidden()).toBe('true');
                expect(page.getElementById('file-name-text').getText()).toEqual('.msp created with some issues');
                const errorFile = './e2e/downloads/errors.txt';
                page.downloadErrorFile().then(() => {
                    browser.driver.wait(function() {
                        return fs.existsSync(errorFile);
                    }, 5*1000, 'Error file should be downloaded');
                });
            });
        });
    });

    it('should download .msp and show error box with large file with missing data', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH_columns_renamed.xlsx');
        const name = './e2e/downloads/Height_0_20197191136negCSH_columns_renamed.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                expect(page.isErrorBoxHidden()).toBe(null);
                expect(page.isCorrectImageHidden()).toBe(null);
                expect(page.isWrongImageHidden()).toBe('true');
                expect(page.getElementById('file-name-text').getText()).toEqual('.msp created with some issues');
            });
        });
    });

    it('should download error file when submitting small file with duplicates', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF_small_duplicates.xlsx');
        page.submitFile();
        const errorFile = './e2e/downloads/errors.txt';
        page.downloadErrorFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(errorFile);
            }, 5*1000, 'Error file should be downloaded');
        });
    });

    it('should download error file when submitting large file with missing data', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/Height_0_20197191136negCSH_columns_renamed.xlsx');
        page.submitFile();
        const errorFile = './e2e/downloads/errors.txt';
        page.downloadErrorFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(errorFile);
            }, 5*1000, 'Error file should be downloaded');
        });
    });

    it('should NOT show error box with medium sized complete file', () => {
        page.navigateTo();
        browser.waitForAngularEnabled(false);
        page.uploadSpreadsheet('../testing-files/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.xlsx');
        const name = './e2e/downloads/Height_0_20198281030_QTOF LIB Run2 08082014_MSMS Hits only.txt';
        page.submitFile().then(() => {
            browser.driver.wait(function() {
                return fs.existsSync(name);
            }, 10*1000, 'File with correct name should be downloaded').then(function() {
                expect(page.isErrorBoxHidden()).toBe('true');
            });
        });
    });

    // Come back to this one, it's not written properly
    xit('should have correct error text when file does not exist', () => {
        page.navigateTo();
        const BOM = "\uFEFF";
        const testData = BOM + "test,data\ntest,data";
        fs.writeFile('./e2e/testing-files/not_a_file.csv', testData, (err) => {
            if (err) throw err;
        });
        page.uploadSpreadsheet('../testing-files/not_a_file.csv');
        expect(fs.existsSync('./e2e/testing-files/not_a_file.csv')).toBe(true);
        // fs.unlinkSync('./e2e/testing-files/not_a_file.csv');
        // expect(fs.existsSync('./e2e/testing-files/not_a_file.csv')).toBe(false);

        // page.submitFile();
        // const text = 'Error: file may be corrupted or may not exist; Check uploaded file';
        // expect(page.getErrorText()).toEqual(text);
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
