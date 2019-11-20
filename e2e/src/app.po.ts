import { browser, by, element } from 'protractor';
import * as path from 'path';
import * as fs from 'fs';

export class AppPage {
	navigateTo() {
		// Navigating to the home page, I think
		return browser.get(browser.baseUrl) as Promise<any>;
    }
    
    deleteDownloads() {
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
    }

	getTitleText() {
        // Both of these lines work
        return element(by.css('app-root #page-wrapper read-spreadsheet #title')).getText() as Promise<string>;
        // return element(by.id('title')).getText() as Promise<string>;
    }

    getElementById(identifier: string) {
        return element(by.css('#' + identifier));
    }

    elementExists(identifier: string) {
        return element(by.css('#' + identifier)).isPresent();
        // return element(by.css('#' + identifier)).isPresent() as Promise<boolean>;
    }

    isElementHidden(identifier: string) {
        return element(by.id(identifier)).getAttribute('hidden');
    }

    uploadSpreadsheet(fileName: string) {
        const absolutePath = path.resolve(__dirname, fileName);
        element(by.css('input[type="file"]')).sendKeys(absolutePath);
        // Throws an error and is also unnecessary
        // element(by.id('file-input')).click();
    }

    isSubmitDisabled() {
        return element(by.id('submit')).getAttribute('disabled');
    }

    submitFile() {
        return element(by.id('submit')).click();
    }

    getErrorText() {
        // return element(by.id('error-text')).getText();
        return element(by.id('error-text')).getText() as Promise<string>;
    }

    downloadErrorFile() {
        return element(by.id('get-error-file')).click();
    }

    fileExists(name: string) {
        return fs.existsSync(name);
    }
}
