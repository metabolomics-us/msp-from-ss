const config = require('./protractor.conf').config;

config.capabilities = {
    browserName: 'chrome',
    chromeOptions: {
        args: ['--headless', '--no-sandbox', '--test-type=browser']
        ,
        prefs: {
            download: {
                'prompt_for_download': false,
                'directory_upgrade': true,
                'default_directory': '/e2e/downloads'
            }
        }
    }
};

// config.multiCapabilities = [
//     {
//         browserName: 'chrome',
//         chromeOptions: {
//             args: ['--headless', '--no-sandbox']
//             // ,
//             // prefs: {
//             //     'download': {
//             //         'prompt_for_download': false,
//             //         'default_directory': './downloads/'
//             //     }
//             // }
//         }
//     }
//     // ,
//     // {
//     //     browserName: 'firefox',
//     //     'moz:firefoxOptions': {
//     //         args: ['--headless', '--no-sandbox']
//     //     }
//     // }
// ];

exports.config = config;
