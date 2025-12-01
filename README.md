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

To use this extension, you must configure it with your own Google API credentials. This allows the extension to securely access your Gmail account.

**You must have a Google Cloud account to complete these steps.**

### Step 1: Create a Google Cloud Project

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project drop-down and select **New Project**.
3.  Give your project a name (e.g., "Chrome OTP Helper") and click **Create**.

### Step 2: Enable the Gmail API

1.  From your project's dashboard, navigate to **APIs & Services > Library**.
2.  Search for "Gmail API" and select it.
3.  Click the **Enable** button.

### Step 3: Configure the OAuth Consent Screen

1.  Go to **APIs & Services > OAuth consent screen**.
2.  Choose **External** and click **Create**.
3.  Fill in the required fields:
    *   **App name:** "OTP Helper"
    *   **User support email:** Your email address.
    *   **Developer contact information:** Your email address.
4.  Click **Save and Continue**.
5.  On the **Scopes** page, click **Add or Remove Scopes**. Find the scope for **Gmail API** with the path `.../auth/gmail.readonly`, check it, and click **Update**.
6.  Click **Save and Continue**.
7.  On the **Test users** page, add your own Gmail address.
8.  Click **Save and Continue**, then **Back to Dashboard**.

### Step 4: Create OAuth 2.0 Credentials

1.  Go to **APIs & Services > Credentials**.
2.  Click **+ Create Credentials** and select **OAuth client ID**.
3.  For **Application type**, select **Chrome App**.
4.  Give it a name (e.g., "OTP Helper Client").
5.  For **Application ID**, enter the ID of your extension. You can find this in `chrome://extensions` after you have loaded it unpacked.
6.  Click **Create**.

### Step 5: Update the Manifest File

1.  After creating the credentials, a **Client ID** will be displayed. Copy this value.
2.  Open the `manifest.json` file in the extension's code directory.
3.  Find the `oauth2` section and replace `"YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com"` with the Client ID you just copied.

    ```json
    "oauth2": {
      "client_id": "PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
      "scopes": [
        "https://www.googleapis.com/auth/gmail.readonly"
      ]
    }
    ```
4.  Save the `manifest.json` file.
5.  Go back to `chrome://extensions` and click the "Reload" button for the OTP Helper extension.

The setup is now complete. Click the extension icon to log in to your Google account.

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
