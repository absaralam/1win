# mobile_browser.py  (run by orchestrate.py)
import os, sys, time
from appium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

URL         = "https://1wjn.top/"      # the full referral URL you used on desktop
DEVICE_NAME = os.getenv("ANDROID_UDID") or "emulator-5554"  # override if needed

CAPS = {
    "platformName" : "Android",
    "automationName": "UiAutomator2",
    "deviceName"   : DEVICE_NAME,
    "browserName"  : "Chrome",          # launches mobile Chrome!
    "chromedriverExecutableDir": "/path/to/chromedrivers",  # optional pinning
    "autoGrantPermissions": True,       # still handy
    "newCommandTimeout": 600,
}

def allow_push(driver):
    """
    Tap Chrome’s site-level push-notification dialog (“Allow” button).
    We wait 8 s; if it never shows, we assume permission is already granted.
    """
    try:
        WebDriverWait(driver, 8).until(
            EC.element_to_be_clickable((By.ID, "com.android.chrome:id/permission_allow_button"))
        ).click()
        return True
    except Exception:
        return False

def install_pwa(driver):
    """
    1win sometimes shows its own blue “Install” pill at the top.
    Fall back to Chrome’s ⋮ → “Install app” menu entry.
    """
    # try in-page banner first
    banners = driver.find_elements(By.XPATH, "//button[contains(.,'Install')]")
    if banners:
        banners[0].click(); time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(.,'Install')]").click()
        return True

    # Chrome menu path
    driver.execute_script("mobile: shell", {
        "command": "input", "args": ["keyevent", "KEYCODE_MENU"]
    })
    el = WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.XPATH, "//android.widget.TextView[@text='Install app']"))
    )
    el.click()
    time.sleep(1)
    driver.find_element(By.ID,"android:id/button1").click()   # “Install”
    return True

def main():
    drv = webdriver.Remote("http://127.0.0.1:4723", CAPS)
    drv.get(URL)

    if allow_push(drv):
        print("[✓] Push-notification permission granted")
    else:
        print("[·] Push-notification dialog didn’t appear (already allowed?)")

    if install_pwa(drv):
        print("[✓] Install-app flow completed")
    else:
        print("[·] Could not trigger install banner")

    time.sleep(3)
    drv.quit()

if __name__ == "__main__":
    main()
