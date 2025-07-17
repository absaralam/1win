# ──────────────────────────────────────────────────────────────────────────────
#  Basic login-successful smoke test
# ──────────────────────────────────────────────────────────────────────────────
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import pytest
import os
import sys

EMAIL     = os.getenv("ONEWIN_EMAIL")
PASSWORD  = os.getenv("ONEWIN_PASSWORD")

# ------------------ nice, one-line status prints -------------------
def status(msg: str, icon: str = "[·]") -> None:
    """
    Print a single-line progress message.
    ✓ / ✗ / [·]  are kept aligned for quick scanning.
    """
    print(f"{icon} {msg}", flush=True)
# -------------------------------------------------------------------

# plain element.click() is fine now
def tap(driver, element): element.click()

CAPTCHA_UA_SELECTORS = [
    'new UiSelector().textContains("Select all")',
    'new UiSelector().textContains("Click verify")',
    'new UiSelector().text("VERIFY")',
    'new UiSelector().text("NEXT")',
]

def captcha_present(driver) -> bool:
    return any(driver.find_elements(AppiumBy.ANDROID_UIAUTOMATOR, sel)
               for sel in CAPTCHA_UA_SELECTORS)

LOGGED_IN_LOCATORS = [
    # the Deposit pill (native view)
    (AppiumBy.ANDROID_UIAUTOMATOR,
     'new UiSelector().className("android.widget.Button").text("Deposit")'),

    # back-up XPath in case UiSelector ever fails
    (AppiumBy.XPATH, '//android.widget.Button[@text="Deposit"]'),
]
# ---------------------------------------------------------------------------
@pytest.mark.usefixtures("driver")
def test_login_and_get_300_coins(driver):
    wait = WebDriverWait(driver, 25)

    # STEP 0 – open “Sign in” modal
    tap(driver, wait.until(EC.element_to_be_clickable((
        AppiumBy.ANDROID_UIAUTOMATOR,
        'new UiSelector().text("Sign in").instance(0)'
    ))))

    # STEP 1 – credentials
    wait.until(lambda d: len(d.find_elements(AppiumBy.CLASS_NAME,
                                             "android.widget.EditText")) >= 2)
    email_tf, pwd_tf = driver.find_elements(AppiumBy.CLASS_NAME,
                                            "android.widget.EditText")[:2]
    email_tf.send_keys(EMAIL)
    pwd_tf.send_keys(PASSWORD)
    driver.hide_keyboard()
    status("Filled e-mail & password")

    tap(driver, wait.until(EC.presence_of_element_located((
        AppiumBy.ANDROID_UIAUTOMATOR,
        'new UiSelector().text("Sign in").instance(1)'
    ))))

    # STEP 2 – manual captcha solving
    status("CAPTCHA — switch to phone now", icon="🛑")
    WebDriverWait(driver, 300).until_not(captcha_present)
    status("CAPTCHA solved")

    # STEP 3 – confirm login
    try:
        # wait up to 60 s until the Deposit pill becomes present in the native tree
        WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((
                AppiumBy.ANDROID_UIAUTOMATOR,
                'new UiSelector().className("android.widget.Button").text("Deposit")'
            ))
        )
        status("Deposit button visible – logged in", icon="✓")

    except TimeoutException:
        status("Deposit button NOT found", icon="✗")
        pytest.fail("Login UI never changed – ‘Deposit’ button not found")
