import { browser, by, element } from 'protractor';

export class AppPage {
    navigateTo() {
        // Navigating to the home page, I think
        return browser.get(browser.baseUrl) as Promise<any>;
    }

    // getTitleText() {
    //     // This looks like we're getting the title DOM element reference
    //     // return element(by.css('app-root .content span')).getText() as Promise<string>;
    //     return element(by.css('app-root .content span')).getText() as Promise<string>;
    // }

    getExampleLarge() {
        return element(by.css("exampleLarge"));
    }
}
