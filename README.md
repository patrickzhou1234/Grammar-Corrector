# GrammarCorrector

**GrammarCorrector** is a lightweight automation tool that leverages Google's **Gemini-2.5-Flash** model to instantly correct grammar and sentence structure in any application.

By combining AutoHotkey (AHK) and Python, this tool allows you to replace selected text with a polished version using a simple keyboard shortcut.

---

## Features

* **Universal Compatibility:** Works in any text field (Browser, Notepad, Discord, Word, etc.).
* **Gemini Power:** Uses the fast and efficient Gemini-2.5-Flash model.
* **Instant Replacement:** Automatically replaces the highlighted text with the corrected version.

---

## Prerequisites

1. **Python 3.x** installed on your system.
2. **AutoHotkey (v1.1 or v2)** installed.
3. A Google Account.

---

## Configuration & Setup

### 1. Get Your Cookies (Important!)

To authenticate with Gemini, you must retrieve specific cookies. **Follow these steps precisely to avoid session expiry.**

1. Open a **New Incognito Window** (Chrome) or **Private Window** (Firefox).
   > **Critical:** You must use Incognito mode. If you use a standard window, your cookies will expire in approximately 2 hours.
   >
2. Go to [gemini.google.com](https://gemini.google.com) and sign in with your Google account.
3. Open Developer Tools (Press `F12` or right-click -> Inspect).
4. Navigate to the **Application** tab (Chrome) or **Storage** tab (Firefox).
5. On the left sidebar, expand **Cookies** and select `https://gemini.google.com`.
6. Find and copy the values for the following two cookies:
   * `__Secure-1PSID`
   * `__Secure-1PSIDTS`

### 2. Update the Script

1. Open `gemini_worker.py` in a text editor (Notepad, VS Code, etc.).
2. Paste the cookie values you copied into the corresponding variables in the script.
3. Save the file.

---

## Usage

1. Run the **AutoHotkey script** (double-click the `.ahk` file).
2. In any application, **highlight** the text you want to fix.
3. Press the shortcut:

   > **`Ctrl` + `Alt` + `C`**
   >
4. Wait a few seconds. The script will send the text to Gemini and replace your selection with the grammatically corrected version.

---

## Credits

This project utilizes the Gemini API wrapper logic.

* **Core Logic based on:** [HanaokaYuzu/Gemini-API](https://github.com/HanaokaYuzu/Gemini-API)
* **Model:** Google Gemini-2.5-Flash

---

*Disclaimer: This tool uses unofficial API endpoints via browser cookies. If your script stops working, your cookies may have expired or Google may have updated their authentication method. Simply repeat the "Get Your Cookies" step to fix it.*
