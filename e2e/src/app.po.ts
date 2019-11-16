import { browser, by, element } from 'protractor';
import * as path from 'path';

export class AppPage {
	navigateTo() {
		// Navigating to the home page, I think
		return browser.get(browser.baseUrl) as Promise<any>;
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

    uploadSpreadsheet(fileName: string) {
        const absolutePath = path.resolve(__dirname, fileName);
        element(by.css('input[type="file"]')).sendKeys(absolutePath);
        // Throws an error and is also unnecessary
        // element(by.id('fileInput')).click();
    }

    isSubmitValid() {
        return element(by.id('submit')).getAttribute('disabled');
    }

    isErrorBoxHidden() {
        return element(by.id('error-box')).getAttribute('hidden');
        // return element(by.id('error-box')).isDisplayed();
    }

    getErrorText() {
        // return element(by.id('error-text')).getText();
        return element(by.id('error-text')).getText() as Promise<string>;
    }

    submitFile() {
        return element(by.id('submit')).click();
    }
}
