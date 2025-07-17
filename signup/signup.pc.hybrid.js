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

      await browser
        .defaultBrowserContext()
        .overridePermissions(URL, ['notifications']);
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise((resolve) => setTimeout(resolve, 3000)); // pause for inspection

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
            console.error(
              '[ERROR] Signup button failed after 3 attempts:',
              e.message
            );
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
            log(
              `🔁 Retry [${tryModal + 1}] waiting for signup modal`,
              'verbose'
            );
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

      const phoneSelector = 'input[placeholder="301 2345678"]';
      const emailSelector = 'input[placeholder="E-Mail"]';
      const passSelector = 'input[placeholder="Password"]';
      log(`📱 Typing phone: ${phone}`);
      await page.type(phoneSelector, phone);
      log(`📧 Typing email: ${alias}`);
      await page.type(emailSelector, alias);
      log('🔐 Typing password');
      await page.type(passSelector, password);

      // Then proceed with submit
      await page.click('button.register-button-submit');

      const captchaPromise = page
        .waitForSelector('iframe[src*="geetest"], .geetest_panel', {
          timeout: 15000
        })
        .then(() => 'captcha');

      const depositPromise = page
        .waitForFunction(
          'document.querySelector("[data-pw=\\"MODAL-TITLE\\"]")?.innerText.trim() === "Deposit"',
          { timeout: 15000 }
        )
        .then(() => 'deposit');

      const outcome = await Promise.race([
        captchaPromise,
        depositPromise
      ]).catch(() => 'timeout');

      if (outcome === 'captcha') {
        prompt('🛑 CAPTCHA detected – solve it manually in browser');
        prompt(
          '   ✅ Press Enter after solving CAPTCHA and reaching Deposit modal...'
        );
        log('✓ CAPTCHA solved manually', 'verbose');
      } else if (outcome === 'deposit') {
        log('✓ Deposit modal appeared — signup likely accepted', 'verbose');
      } else {
        log(
          '⚠️ No Deposit modal or CAPTCHA appeared — uncertain outcome',
          'silent'
        );
      }

      log('   …waiting for Deposit modal title to remain visible', 'verbose');
      await page.waitForFunction(
        'document.querySelector("[data-pw=\\"MODAL-TITLE\\"]")?.innerText.trim() === "Deposit"',
        { timeout: 60000 }
      );

      log('   ✓ Confirmed Deposit modal visible', 'verbose');

      try {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // replace waitForTimeout
        await page.click('.modal-content__header__row__account-number > svg'); // correct close button
        log('   ⛌ Deposit modal closed', 'verbose');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch {
        log('   ⚠️  Could not close modal (already gone?)', 'silent');
      }

      // STEP 1 – Open Profile Dropdown
      log('   👤 Clicking profile avatar…', 'verbose');
      await page.waitForSelector('.user-menu__avatar-background', {
        visible: true
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.click('.user-menu__avatar-background');
      await new Promise((resolve) => setTimeout(resolve, 300)); // brief pause to ensure dropdown renders

      const items = await page.$$('.user-menu__item');
      for (const el of items) {
        const text = await page.evaluate((el) => el.textContent, el);
        if (text.trim() === 'Settings') {
          await el.click();
          break;
        }
      }

      // STEP 3 – Wait for Settings Modal to open
      log('   🧩 Waiting for settings modal...', 'verbose');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.waitForSelector('[data-pw="MODAL-TITLE"]', { visible: true });
      const modalTitle = await page.$eval(
        '[data-pw="MODAL-TITLE"]',
        (el) => el.textContent
      );
      log(`🔖 Modal opened with title: ${modalTitle}`, 'normal');
      await new Promise((resolve) => setTimeout(resolve, 2000)); // <— 2s pause to visually confirm modal

      // STEP 4 – Click on Email field box
      log('   📧 Clicking email field block…', 'verbose');
      await page.waitForSelector(
        '.ProfileFormValidationField_mainBlock_YvJCH',
        { visible: true }
      );
      await page.click('.ProfileFormValidationField_mainBlock_YvJCH');
      await new Promise((resolve) => setTimeout(resolve, 1500)); // pause before browser closes

      // STEP 5 – Click the blue “Request” button
      log('   ✉️ Clicking Request to send verification email…', 'verbose');
      await page.waitForSelector('button.StepEmailInput_btn_zU170', {
        visible: true
      });
      await page.click('button.StepEmailInput_btn_zU170');
      await new Promise((resolve) => setTimeout(resolve, 1500)); // pause before browser closes

      // ✅ Save account immediately after signup
      const newAccount = {
        alias,
        password,
        phone,
        signupDone: true,
        emailVerified: false
      };
      accounts.push(newAccount);
      save(accounts);
      log('✅ Signup saved, requesting email confirmation…', 'silent');
      // ✅ Update email verification status
      newAccount.emailVerified = true;
      save(accounts);
      log('✅ Verification email requested successfully', 'silent');
      log(`   ✅ Saved ${alias}\n`, 'silent');
      successes.push(alias);
      await browser.close(); // ✅ close this browser now
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
  if (failures.length > 0)
    log(`   Failed accounts: ${failures.join(', ')}`, 'silent');

  log('🧹 Cleaning up any open browsers...', 'verbose');
  for (const b of openBrowsers) {
    try {
      await b.close();
    } catch {}
  }

  log('🎉 All requested registrations processed.', 'silent');
})();
