import subprocess, shutil, time, urllib.request, json, sys

def adb(*args):
    """Call ADB; raise CalledProcessError on failure."""
    subprocess.run(["adb", *args], check=True, stdout=subprocess.DEVNULL)

def wait_on_appium(host="127.0.0.1", port=4723, timeout=15):
    url = f"http://{host}:{port}/status"
    for _ in range(timeout):
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                if r.status == 200 and json.load(r)["value"]["ready"]:
                    return True
        except Exception:
            time.sleep(1)
    return False

def status(msg):
    print(msg, flush=True)
