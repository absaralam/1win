# 1win Automation Suite

This project is a fully automated end-to-end flow for creating, logging into, and verifying 1win user accounts across both desktop and Android.

It includes:

- ✅ **Desktop Signup (Puppeteer)** — Hybrid signup with stealth and retry logic.
- 📱 **Android Automation (Appium)** — Chrome login, PWA install, and native app verification.
- 📂 **Account State Tracking** — Uses `accounts.json` to persist signup progress.
- 🧪 **PyTest + ADB + WebDriver** — Reliable, permission-granted Appium sessions.
- 🤖 **CAPTCHA Handling** — Manual + 2Captcha solver support with token extraction.

---

## 🔧 Stack Overview

| Component        | Tech Used                  |
|------------------|----------------------------|
| Desktop Signup    | Puppeteer + Stealth Plugin |
| Mobile Automation | Appium + PyTest            |
| Captcha Solving   | Manual or 2Captcha         |
| Android Tests     | `run_android.py`, `test_get_300.py` |
| Orchestration     | `orchestrate.py`           |

---

## 📁 Folder Layout

├── accounts.json # Persistent account records
├── signup.pc.hybrid.js # Main PC-side signup runner
├── run_chrome.py # Appium script: Chrome login
├── install_pwa.py # Appium script: install PWA from Chrome
├── run_android.py # Appium script: native app login and test
├── orchestrate.py # Orchestrates full account flow
├── conftest.py # PyTest fixture: Appium + ADB setup
├── test_get_300.py # Final login + coin confirmation test
├── solve_geetest.js # Optional: CAPTCHA solver for Geetest
├── config.js # Global config values


---

## 🤖 LLM Assistant Usage (Gemini, ChatGPT, Copilot, etc.)

This repo is **actively used with LLMs** for code generation, automation assistance, and debugging. If you're using an AI assistant or plugin, please follow these strict rules:

- ✅ Prefer **accuracy over speed** — no hallucinations or made-up logic.
- ✅ Reference this repo’s actual file structure and logic when answering.
- ⚠️ Avoid outdated practices, fake code, or assumed libraries.
- ⚙️ This project is used on real Android devices and production-like flows — everything must be runnable and safe.
- 🧪 Always offer verification or test tips alongside any generated solution.
- 📍 This repo is available at: [github.com/absaralam/1win](https://github.com/absaralam/1win)

> 📡 Gemini is connected directly to this repository as an app.

---

## 🧩 Requirements

- Node.js 18+
- Python 3.10+
- Appium (v2.x) with `adb_shell` support
- Android emulator or real device with USB debugging
- Chrome + chromedriver (auto-downloaded)
- Optional: 2Captcha API key for solving Geetest

---

## ✅ Status

> ✔ Desktop signup is complete and 100% working.  
> 🧪 Android automation is being refined.

---
