import os, subprocess, sys, json, pathlib

def run_android(email, pw):
    env = os.environ.copy()
    env["ONEWIN_EMAIL"]    = email
    env["ONEWIN_PASSWORD"] = pw
    env["PYTHONUNBUFFERED"] = "1" 

    # use -q so pytest prints *only* what your test prints
    return subprocess.call(["pytest", "-q", "-s", "test_get_300.py"], env=env)
    return completed.returncode

if __name__ == "__main__":
    em, pw = sys.argv[1:]
    code   = run_android(em, pw)
    sys.exit(code)
