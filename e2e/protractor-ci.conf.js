const config = require('./protractor.conf').config;

// config.capabilities = {
//   browserName: 'chrome',
//   chromeOptions: {
//     args: ['--headless', '--no-sandbox']
//   }
// };

config.multiCapabilities = [
    {
        browserName: 'chrome',
        chromeOptions: {
            args: ['--headless', '--no-sandbox']
        }
    }
    // ,
    // {
    //     browserName: 'firefox',
    //     'moz:firefoxOptions': {
    //         args: ['--headless', '--no-sandbox']
    //     }
    // }
];

exports.config = config;
