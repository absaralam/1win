# -*- coding: utf-8 -*-
"""
PyTest fixtures for the 1win mobile tests.
• Spins up its own Appium 2 server in the background (with adb_shell enabled)
• Clears the app’s cache on the device, so each run starts from a virgin state
• Grants POST_NOTIFICATIONS so the pop-up never re-appears
• Yields a webdriver.Remote instance and shuts everything down afterwards
"""
import subprocess
import pytest
from appium import webdriver
from appium.webdriver.appium_service import AppiumService
from appium.options.android import UiAutomator2Options

# ────────────────────────────────────────────────
#  YOUR APP & DEVICE
# ────────────────────────────────────────────────
PACKAGE = "com.one_win.mobile_app"

CAPS_DICT = {
    "platformName":          "Android",
    "automationName":        "UiAutomator2",
    "appPackage":            PACKAGE,
    "appActivity":           "com.common.MainActivity",
    "udid":                  "gar4k7vg99fyin5h",
    "autoGrantPermissions":  True,
    "newCommandTimeout":     600,
}
CAPS = UiAutomator2Options().load_capabilities(CAPS_DICT)   # ← v5 client wants Options

# ────────────────────────────────────────────────
#  LITTLE ADB HELPER
# ────────────────────────────────────────────────
def _adb(*shell_args: str) -> None:
    """
    Fire an `adb shell …` command and raise if it fails.
    Example:  _adb("pm", "clear", PACKAGE)
    """
    subprocess.run(
        ["adb", "shell", *shell_args],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

# ────────────────────────────────────────────────
#  WEBDRIVER  (session-scope)
# ────────────────────────────────────────────────
@pytest.fixture(scope="session")
def driver() -> webdriver.Remote:
    """Start a fresh Appium server + clean app and yield a driver."""
    host, port = "127.0.0.1", 4723
    service = AppiumService()
    service.start(
        args=[
            "--address", host,
            "--port",    str(port),
            "--session-override",
            "--allow-insecure", "adb_shell",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout_ms=20_000,
    )
    if not service.is_running:
        pytest.exit("❌  Appium did not start within 20 s")

    # 1) wipe previous app data (cache + storage)
    _adb("am", "force-stop", PACKAGE)
    _adb("pm", "clear",      PACKAGE)

    # 2) create the driver
    drv = webdriver.Remote(f"http://{host}:{port}", options=CAPS)
    drv.implicitly_wait(2)

    # 3) grant POST_NOTIFICATIONS so the dialog never shows
    _adb("pm", "grant", PACKAGE, "android.permission.POST_NOTIFICATIONS")

    yield drv                             # ── run tests ──

    drv.quit()
    service.stop()
