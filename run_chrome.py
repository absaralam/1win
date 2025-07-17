import sys, time, helpers
from appium import webdriver
from appium.options.android import UiAutomator2Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

EMAIL, PASSWORD = sys.argv[1:3]

opts = (
    UiAutomator2Options()
    .set_capability("platformName", "Android")
    .set_capability("automationName", "UiAutomator2")
    .set_capability("deviceName", "Android")
    .set_capability("appPackage", "com.android.chrome")
    .set_capability("appActivity", "com.google.android.apps.chrome.Main")
    .set_capability("noReset", False)
    .set_capability("autoGrantPermissions", True)
    .set_capability("chromedriver_autodownload", True)
)

drv = webdriver.Remote("http://127.0.0.1:4723", options=opts)

wait = WebDriverWait(drv, 30)

def dismiss_first_run():
    for _ in range(3):
        for text in ("Accept & continue", "No thanks", "Continue without", "Turn on sync"):
            els = drv.find_elements(By.ANDROID_UIAUTOMATOR,
                f'new UiSelector().textContains("{text}")')
            if els:
                els[0].click()
                time.sleep(1)

helpers.status("[·] Dismissing first-run pop-ups")
dismiss_first_run()

helpers.status("[·] Navigating to 1win login URL")
drv.execute_script("mobile: shell", {
    "command": "am",
    "args": ["start", "-a", "android.intent.action.VIEW",
             "-d", "https://1waqhg.life/login" ]
})

email_tf = wait.until(EC.element_to_be_clickable(
    (By.XPATH, '//input[@type="email" or @name="email"]')))
password_tf = drv.find_element(By.XPATH,
    '//input[@type="password" or @name="password"]')

email_tf.send_keys(EMAIL)
password_tf.send_keys(PASSWORD)

drv.find_element(By.XPATH, '//button[.//text()[contains(., "Sign in") or contains(., "Log in")]]').click()

helpers.status("[·] Submitted login form – waiting for dashboard")
try:
    wait.until(EC.presence_of_element_located((
        By.XPATH, '//*[contains(text(),"Deposit") or contains(text(),"Balance")]')))
    helpers.status("✓ Chrome login succeeded")
    drv.quit()
    sys.exit(0)
except Exception as e:
    helpers.status(f"⚠ Chrome login failed → {e}")
    drv.quit()
    sys.exit(1)
