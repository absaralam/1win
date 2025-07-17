const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fetch = require('node-fetch');
const config = require('./config');

const URL = config.BASE_URL;
const API_KEY = 'cff2c92acf2cf5cf21bfa244aad9c343';
const { DEVICE_PROFILES } = config;
const device = 'android';
const { userAgent, viewport } = DEVICE_PROFILES[device];

async function extractGeetestTokens(page) {
  const content = await page.content();
  const gtMatch = content.match(/gt\s*:\s*['"](.+?)['"]/);
  const challengeMatch = content.match(/challenge\s*:\s*['"](.+?)['"]/);
  if (!gtMatch || !challengeMatch) throw new Error('❌ Geetest tokens not found in page HTML');
  return {
    gt: gtMatch[1],
    challenge: challengeMatch[1]
  };
}

async function requestCaptchaSolution(gt, challenge) {
  const url = `http://2captcha.com/in.php?key=${API_KEY}&method=geetest&gt=${gt}&challenge=${challenge}&pageurl=${URL}&json=1`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 1) throw new Error('2Captcha submit failed: ' + json.request);
  return json.request; // captcha ID
}

async function pollForResult(captchaId, maxRetries = 20) {
  const url = `http://2captcha.com/res.php?key=${API_KEY}&action=get&id=${captchaId}&json=1`;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 1) return JSON.parse(json.request);
    console.log(`⏳ Waiting for CAPTCHA solution (${i + 1})`);
  }
  throw new Error('Timed out waiting for CAPTCHA solution');
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: []
  });

  const page = await browser.newPage();
  await page.setUserAgent(userAgent);
  await page.setViewport(viewport);

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000); // allow UI to settle

    // 🔓 Click login button manually if needed
    await page.waitForSelector('button[data-pw="HEADER-AUTH-BUTTON"]', { timeout: 15000 });
    await page.click('button[data-pw="HEADER-AUTH-BUTTON"]');

    console.log('🔍 Looking for Geetest tokens...');
    await page.waitForTimeout(5000); // let captcha iframe load

    const { gt, challenge } = await extractGeetestTokens(page);
    console.log('🎯 Geetest tokens:', { gt, challenge });

    const captchaId = await requestCaptchaSolution(gt, challenge);
    console.log('📤 Submitted to 2Captcha — ID:', captchaId);

    const solution = await pollForResult(captchaId);
    console.log('✅ CAPTCHA Solved:', solution);

    // TODO: inject `geetest_challenge`, `geetest_validate`, `geetest_seccode` into the widget

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    // keep browser open for dev inspection
  }
})();
