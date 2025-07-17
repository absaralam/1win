const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const config = require('./config');

const URL = config.BASE_URL;
const HEADLESS_MODE = false;

const alias = '1windummy+46@gmail.com';
const password = config.DEFAULT_PASSWORD;

async function loginAs(device, { alias, password }) {
  const { userAgent, viewport } = config.DEVICE_PROFILES[device];
  const browser = await puppeteer.launch({
    headless: HEADLESS_MODE ? 'new' : false,
    args: []
  });
  const page = await browser.newPage();
  await page.setUserAgent(userAgent);
  await page.setViewport(viewport);

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000)); // wait for layout

  try {
    // open login modal
    await page.waitForSelector('button[data-pw="HEADER-AUTH-BUTTON"]', { timeout: 10000 });
    await page.click('button[data-pw="HEADER-AUTH-BUTTON"]');

    // fill login form
    await page.waitForSelector('input[data-pw="LOGIN-MODAL-USERNAME-INPUT"]', { timeout: 10000 });
    await page.type('input[data-pw="LOGIN-MODAL-USERNAME-INPUT"]', alias);

    await page.waitForSelector('input[data-pw="LOGIN-MODAL-PASSWORD-INPUT"]', { timeout: 10000 });
    await page.type('input[data-pw="LOGIN-MODAL-PASSWORD-INPUT"]', password);

    await page.click('button[data-pw="LOGIN-MODAL-LOGIN-BUTTON"]');

    // confirm successful login modal appears
    await page.waitForSelector('div.modal-content__header__row__cell__title', { timeout: 15000 });
    console.log(`✅ ${device.toUpperCase()} login success`);
  } catch (e) {
    console.log(`❌ ${device.toUpperCase()} login failed: ${e.message}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  await loginAs('android', { alias, password });
})();
