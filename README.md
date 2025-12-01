# OTP Helper Chrome Extension

OTP Helper is a Chrome extension designed for enterprise environments to streamline the use of One-Time Passwords (OTPs) received via Gmail. It automatically detects and extracts OTPs, injects them into web forms, and provides a simple interface for managing recently received codes.

## Features

- **Automatic OTP Detection:** Monitors your Gmail account for new emails containing OTP codes.
- **One-Click Copy:** Click the extension icon to see a list of recent OTPs and copy them to the clipboard.
- **Auto-Injection (In Development):** Automatically fills in OTP fields on websites.
- **Badge Notifications:** The extension icon changes color and shows a count of available OTPs.
- **Secure:** Uses Google's official APIs and OAuth 2.0 for secure access to your Gmail data. Your data is processed locally and never sent to a third-party server.

## Installation

Since this is a custom extension, it must be loaded into Chrome manually.

1.  **Download the Code:** Clone or download this repository to your local machine.
2.  **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions`.
3.  **Enable Developer Mode:** In the top right corner, toggle on "Developer mode".
4.  **Load the Extension:** Click the "Load unpacked" button and select the directory where you downloaded the code.
5.  The OTP Helper icon will appear in your browser's toolbar.

## Configuration: Setting up Google API Credentials

To use this extension, you must configure it with your own Google API credentials. This allows the extension to securely access your Gmail account. The process involves two main parts: creating credentials in the Google Cloud Console and adding them to the extension's settings.

**You must have a Google Cloud account to complete these steps.**

### Part 1: Create Google API Credentials

1.  **Create a Google Cloud Project:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Click the project drop-down and select **New Project**.
    *   Give your project a name (e.g., "Chrome OTP Helper") and click **Create**.

2.  **Enable the Gmail API:**
    *   From your project's dashboard, navigate to **APIs & Services > Library**.
    *   Search for "Gmail API" and select it.
    *   Click the **Enable** button.

3.  **Configure the OAuth Consent Screen:**
    *   Go to **APIs & Services > OAuth consent screen**.
    *   Choose **External** and click **Create**.
    *   Fill in the required app information (App name: "OTP Helper", your email for support and developer contact).
    *   On the **Scopes** page, add the `.../auth/gmail.readonly` scope.
    *   On the **Test users** page, add the Google account(s) you want to use with this extension.

4.  **Create OAuth 2.0 Credentials:**
    *   Go to **APIs & Services > Credentials**.
    *   Click **+ Create Credentials** and select **OAuth client ID**.
    *   For **Application type**, select **Chrome App**.
    *   Give it a name (e.g., "OTP Helper Client").
    *   For **Application ID**, you must enter the ID of your extension. You can find this by following the **Installation** steps below first, and then looking at the ID of the loaded extension in `chrome://extensions`.
    *   Click **Create**.

5.  **Copy Your Client ID:**
    *   After creating the credentials, a **Client ID** will be displayed. **Copy this value.** You will need it in the next part.

### Part 2: Configure the Extension

1.  **Open Extension Options:**
    *   After [installing the extension](#installation), right-click the OTP Helper icon in your Chrome toolbar.
    *   Select **Options**. This will open a new tab with the configuration page.

2.  **Save Your Client ID:**
    *   Paste the **Client ID** you copied from the Google Cloud Console into the input field.
    *   Click **Save**.

3.  **Log In:**
    *   The setup is now complete. Click the extension icon in your toolbar. This will prompt a Google login window. Sign in to the account you designated as a "test user" to grant the extension access.

## Permissions

-   **identity:** To securely connect to your Google account using OAuth 2.0 without you having to manage passwords.
-   **storage:** To store the list of recent OTPs on your local machine.
-   **alarms:** To periodically check your Gmail for new OTPs.
-   **https://www.googleapis.com/:** To communicate with the Gmail API.
-   **<all_urls>:** To inject the OTP code into any website you are visiting.

## Security

This extension is designed with security in mind.

-   It only requests **read-only** access to your Gmail. It cannot send emails or modify your account in any way.
-   Authentication tokens are managed securely by Chrome's `identity` API.
-   OTPs are stored temporarily in `chrome.storage.local` and are not synced across devices.
-   **Disclaimer:** While secure, storing multiple OTPs, even temporarily, can be a security risk if your computer is compromised. This extension is intended for use in trusted enterprise environments.
