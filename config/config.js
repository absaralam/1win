export default {
  BASE_URL: 'https://1waqhg.life',
  DEFAULT_EMAIL_DOMAIN: 'gmail.com',
  DEFAULT_PASSWORD: '@Abc123',
  HEADLESS_MODE: true, // set to false to debug with visible Chrome
  LOG_LEVEL: 'silent', // options: 'verbose', 'normal', 'silent'

  ACCOUNT_DATA_PATH: '../accounts.json', // or e.g. '../data/accounts.json'

  DEVICE_PROFILES: {
    android: {
      userAgent:
        'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
      viewport: { width: 412, height: 915, isMobile: true, hasTouch: true }
    },
    iphone: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844, isMobile: true, hasTouch: true }
    }
  }
};
