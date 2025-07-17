#!/usr/bin/env python
import json, pathlib, subprocess, sys, shutil, time, contextlib
import helpers                                        # ← add this

ROOT = pathlib.Path(__file__).parent
ACCOUNTS = ROOT / "accounts.json"
NODE = shutil.which("node") or "node"

def load():  return json.loads(ACCOUNTS.read_text())
def save(d): ACCOUNTS.write_text(json.dumps(d, indent=2))

@contextlib.contextmanager
def appium():
    APPIUM_BIN = (shutil.which("appium") or
                  shutil.which("appium.cmd") or
                  r"C:\Users\absar\AppData\Roaming\npm\appium.cmd")
    if not APPIUM_BIN:
        sys.exit("❌  Appium not found – install with  `npm i -g appium`")

    proc = subprocess.Popen(
        [APPIUM_BIN, "--address", "127.0.0.1", "--port", "4723",
         "--session-override", "--allow-insecure", "adb_shell"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not helpers.wait_on_appium():
        proc.kill(); sys.exit("❌  Appium failed to start within 15 s")
    try:
        yield
    finally:
        proc.terminate()

def desktop_signup(acc):
    if acc.get("signupDone"):
        helpers.status("✓ Desktop signup already done")   # ← NEW
        return
    helpers.status("[·] Running desktop signup …")        # ← NEW
    tmp = ROOT / "new.json"
    subprocess.check_call([NODE, "signup-manual.js", tmp])
    data = json.loads(tmp.read_text()); tmp.unlink()
    acc.update(alias=data["email"], password=data["password"],
               signupDone=True, desktopDone=True)
    helpers.status("✓ Desktop signup finished")           # ← NEW

def phase(title, fn, *apps_to_clear):
    helpers.status(f"[·] {title}")        # uses new helpers.status
    ok = fn() == 0
    for pkg in apps_to_clear:
        helpers.adb("pm", "clear", pkg)
    return ok

def main():
    data = load()
    acc  = next((a for a in data if not a.get("androidDone")), None)
    if not acc:
        helpers.status("🎉  Every account is finished!")
        return

    desktop_signup(acc); save(data)

    email, pw = acc["alias"], acc["password"]

    with appium():
        if not phase("Android Chrome login …",
                     lambda: subprocess.call([sys.executable,
                                              "run_chrome.py", email, pw]),
                     "com.android.chrome"):
            return

        if not phase("PWA install …",
                     lambda: subprocess.call([sys.executable,
                                              "install_pwa.py"]),
                     "com.android.chrome"):
            return

        if not phase("Native-app flow …",
                     lambda: subprocess.call([sys.executable,
                                              "run_native.py", email, pw]),
                     "com.one_win.mobile_app"):
            return

    acc["androidDone"] = True; save(data)
    helpers.status("✅ Account completed end-to-end")
    helpers.adb("pm", "clear", "com.android.chrome")
    helpers.grant_perm("com.android.chrome",
                       "android.permission.POST_NOTIFICATIONS")

if __name__ == "__main__":
    main()
