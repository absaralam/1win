// pc_hybrid.js  – best-of-both-worlds registration (persistent + cleanup)

import fs from 'fs';
import path from 'path';
import promptSync from 'prompt-sync';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from '../config/config.js';

const prompt = promptSync({ sigint: true });
puppeteer.use(StealthPlugin());

const DATA_FILE = path.resolve(config.ACCOUNT_DATA_PATH);
const URL = config.BASE_URL;
const HEADLESS_MODE = config.HEADLESS_MODE;
const LOG_LEVEL = config.LOG_LEVEL;

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function save(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function randPhone() {
  return (
    '03' +
    Math.floor(Math.random() * 1e9)
      .toString()
      .padStart(9, '0')
  );
}

function log(message, level = 'normal') {
  const levels = ['silent', 'normal', 'verbose'];
  const currentLevel = levels.indexOf(config.LOG_LEVEL);
  const messageLevel = levels.indexOf(level);
  if (messageLevel <= currentLevel) {
    console.log(message);
  }
}

let [base, from, to] = process.argv.slice(2);
if (!base) base = prompt('Enter base email (before "+" and "@"): ');
if (!from) from = prompt('Enter starting numeric suffix: ');
if (!to) to = prompt('Enter ending numeric suffix: ');
const domain = prompt(
  'Enter email domain (after "@"): ',
  config.DEFAULT_EMAIL_DOMAIN
).trim();

from = Number(from);
to = Number(to);
if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
  console.error('❌ Invalid range.');
  process.exit(1);
}

(async () => {
  const accounts = load();
  const retries = [];
  const successes = [];
  const failures = [];
  const openBrowsers = [];

  async function register(i) {
    const alias = `${base}+${i}@${domain}`;
    const exists = accounts.find((a) => a.alias === alias && a.signupDone);
    if (exists) {
      log(`✔️  ${alias} already completed – skipping`, 'normal');
      return;
    }

    log(`📝 Registering ${alias}...`, 'silent');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: HEADLESS_MODE ? 'new' : false,
        args: HEADLESS_MODE
          ? ['--window-position=2000,0', '--start-minimized']
          : []
      });
      openBrowsers.push(browser);
      const page = await browser.newPage();
      const MODAL_TITLE = 'div.modal-content__header__row__cell__title';
      const CLOSE_BTN = 'svg[data-pw="MODAL-CLOSE-BUTTON"]';

      await browser
        .defaultBrowserContext()
        .overridePermissions(URL, ['notifications']);
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

      for (let retry = 0; retry < 3; retry++) {
        try {
          await page.waitForSelector(
            'button.df-aic-jcc.green.theme-default.header-button',
            { visible: true, timeout: 10000 }
          );
          await page.click(
            'button.df-aic-jcc.green.theme-default.header-button'
          );
          break;
        } catch (e) {
          if (retry === 2)
            console.error('[ERROR] Signup button failed after 3 attempts:', e.message);
            throw new Error('Sign up button not found after retries');
          log(`🔁 Retry [${retry + 1}] waiting for signup button`, 'verbose');
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      let formAppeared = false;
      for (let tryModal = 0; tryModal < 2; tryModal++) {
        try {
          await page.waitForSelector('button.register-button-submit', {
            timeout: 10000
          });
          formAppeared = true;
          break;
        } catch (e) {
          if (tryModal === 1) {
            console.error('[ERROR]', e.message || e);
          } else {
            log(`🔁 Retry [${tryModal + 1}] waiting for signup modal`, 'verbose');
            await page.click(
              'button.df-aic-jcc.green.theme-default.header-button'
            );
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }
      if (!formAppeared) throw new Error('Signup modal never appeared');

      const phone = randPhone();
      const password = config.DEFAULT_PASSWORD;
      const fields = await page.$$('input');
      if (fields.length < 3) throw new Error('Form input fields not found');
      await fields[0].type(phone);
      await fields[1].type(alias);
      await fields[2].type(password);

      await page.click('button.register-button-submit');

      const outcome = await Promise.race([
        page
          .waitForSelector('div.modal-content__header__row__cell__title', {
            timeout: 15000
          })
          .then(() => 'modal'),
        page
          .waitForSelector('iframe[src*="geetest"], .geetest_panel', {
            timeout: 15000
          })
          .then(() => 'captcha')
      ]).catch(() => 'timeout');

      if (outcome === 'captcha') {
        log('🛑 CAPTCHA detected – solve it manually in browser', 'silent');
        prompt(
          '   ✅ Press Enter after solving CAPTCHA and reaching Deposit modal...'
        );
      } else if (outcome === 'modal') {
        log('✓ Modal appeared — signup likely accepted', 'verbose');
      } else {
        log('⚠️  No modal or CAPTCHA appeared — uncertain outcome', 'silent');
      }

      log('   …waiting for Deposit modal', 'verbose');
      await page.waitForSelector(MODAL_TITLE, {
        visible: true,
        timeout: 60000
      });
      log('   ✓ Deposit modal detected', 'verbose');

      try {
        await page.click(CLOSE_BTN);
        log('   ⛌ Deposit modal closed', 'verbose');
      } catch {
        log('   ⚠️  Could not close modal (already gone?)', 'silent');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await browser.close();

      accounts.push({
        alias,
        password,
        phone,
        signupDone: true,
        desktopDone: true,
        androidDone: false
      });
      save(accounts);

      log(`   ✅ Saved ${alias}\n`, 'silent');
      successes.push(alias);
    } catch (err) {
      log(`⚠️  Error registering ${alias}: ${err.message}\n`, 'silent');
      if (browser) openBrowsers.push(browser); // track unclosed browser for later cleanup
      retries.push(i);
      failures.push(alias);
    }
  }

  for (let i = from; i <= to; i++) {
    await register(i);
  }

  let retryCount = 0;
  while (retries.length > 0 && retryCount < 5) {
    log(
      `🔁 Retry round ${retryCount + 1} for ${retries.length} accounts...`,
      'verbose'
    );
    const retryNow = [...retries];
    retries.length = 0;
    for (const i of retryNow) {
      await register(i);
    }
    retryCount++;
  }

  log('✅ Summary:', 'silent');
  log(`   Successful: ${successes.length}`, 'silent');
  log(`   Failed: ${failures.length}`, 'silent');
  if (failures.length > 0) log(`   Failed accounts: ${failures.join(', ')}`, 'silent');

  log('🧹 Cleaning up any open browsers...', 'verbose');
  for (const b of openBrowsers) {
    try {
      await b.close();
    } catch {}
  }

  log('🎉 All requested registrations processed.', 'silent');
})();
