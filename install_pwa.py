# install_pwa.py  –– add-to-home-screen from Chrome (Android)

from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from appium import webdriver
import sys, time

APP_URL = "https://1wxyz.com/"          # → whatever the real URL is
WAIT    = 30                            # seconds

# --------------------------------------------------------------------------- #
opts = (
    UiAutomator2Options()
    .set_capability("appPackage",  "com.android.chrome")
    .set_capability("appActivity", "com.google.android.apps.chrome.Main")
    .set_capability("noReset",     False)                     # start clean
    .set_capability("autoGrantPermissions", True)
    .set_capability("chromedriver_autodownload", True)        # future-proof
)

drv  = webdriver.Remote("http://127.0.0.1:4723", options=opts)
wait = WebDriverWait(drv, WAIT)

def dismiss_first_run():
    """
    Handle Google-Chrome first-run dialogs once.
    They appear only on a completely fresh `pm clear com.android.chrome`.
    """
    try:
        # Accept & continue (Terms of service)
        btn = wait.until(
            EC.element_to_be_clickable(
                (AppiumBy.ID, "com.android.chrome:id/terms_accept")
            )
        )
        btn.click()

        # “Turn on sync?” → tap *No thanks*
        no_sync = wait.until(
            EC.element_to_be_clickable(
                (AppiumBy.ID,
                 "com.android.chrome:id/negative_button")
            )
        )
        no_sync.click()
    except TimeoutException:
        # Dialogs already gone – perfectly fine
        pass

def open_site():
    drv.execute_script(
        "mobile: shell",
        {"command": "am",
         "args": ["start", "-a", "android.intent.action.VIEW",
                  "-d", APP_URL]}
    )
    # wait until page load indicator disappears
    time.sleep(5)

def install_pwa():
    # open 3-dot overflow
    menu_btn = wait.until(
        EC.element_to_be_clickable(
            (
                AppiumBy.ACCESSIBILITY_ID,  # = content-desc
                "More options"
            )
        )
    )
    menu_btn.click()

    # choose “Add to Home screen” or “Install app”
    item = wait.until(
        EC.element_to_be_clickable(
            (
                AppiumBy.ANDROID_UIAUTOMATOR,
                'new UiSelector().textContains("Home")'
                '| new UiSelector().textContains("Install")'
            )
        )
    )
    item.click()

    # confirm dialog (button text differs by Android version)
    add_btn = wait.until(
        EC.element_to_be_clickable(
            (
                AppiumBy.ANDROID_UIAUTOMATOR,
                'new UiSelector().className("android.widget.Button")'
                '.textMatches("Add|Install")'
            )
        )
    )
    add_btn.click()

# --------------------------------------------------------------------------- #
try:
    dismiss_first_run()
    open_site()
    install_pwa()
    print("✓ PWA successfully installed")
    sys.exit(0)
except Exception as e:
    print("⚠ PWA install failed →", e)
    sys.exit(1)
finally:
    drv.quit()
