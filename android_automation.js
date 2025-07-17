// android_automation.js

const { remote } = require('webdriverio');

async function main() {
  // 1) connect to the Appium server
  const driver = await remote({
    protocol: 'http',
    hostname: 'localhost',
    port: 4723,
    path: '/wd/hub',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'emulator-5554',
      'appium:appPackage': 'com.one_win.mobile_app',
      'appium:appActivity': '.MainActivity',
      'appium:noReset': true
    }
  });

  // 2) inspect your app with UIAutomatorViewer or Appium Inspector
  //    and replace this selector with one that actually exists:
  //    e.g. resource-id, accessibility id, text, xpath, etc.
  const myButton = await driver.$(
    'android=new UiSelector().resourceId("com.one_win.mobile_app:id/YOUR_REAL_ID")'
  );
  await myButton.waitForExist({ timeout: 10_000 });
  await myButton.click();

  // 3) ...any other interactions...

  // 4) end the session
  await driver.deleteSession();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
