// background.js

// --- Constants and State ---

const GMAIL_API_URL = 'https://www.googleapis.com/gmail/v1/users/me/messages';
const CHECK_INTERVAL_MINUTES = 1;
const OTP_REGEX = /\b(\d{6,8})\b/g;
const OTP_KEYWORDS = ['verification code', 'otp', 'one-time password', 'authentication code', 'security code'];

// --- Manual Authentication ---

async function getAuthToken() {
    // 1. Check for a valid, stored token
    const tokenInfo = await chrome.storage.local.get(['authToken', 'tokenExpires']);
    if (tokenInfo.authToken && tokenInfo.tokenExpires && Date.now() < tokenInfo.tokenExpires) {
        return tokenInfo.authToken;
    }

    // 2. If no valid token, start the auth flow
    const { clientId } = await chrome.storage.local.get('clientId');

    // 2a. If no clientId, open options and fail
    if (!clientId) {
        chrome.runtime.openOptionsPage();
        throw new Error("Client ID not configured. Please set it in the options page.");
    }

    // 2b. Launch the web auth flow
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = "https://www.googleapis.com/auth/gmail.readonly";
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', scope);

    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
            url: authUrl.href,
            interactive: true
        }, async (responseUrl) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            if (!responseUrl) {
                return reject(new Error("Authentication flow was cancelled by the user."));
            }

            try {
                const url = new URL(responseUrl);
                const params = new URLSearchParams(url.hash.substring(1)); // Use hash for token response
                const accessToken = params.get('access_token');
                const expiresIn = params.get('expires_in');

                if (!accessToken) {
                    throw new Error("Authentication failed: No access token found in response.");
                }

                const expiryTime = Date.now() + (parseInt(expiresIn, 10) * 1000);
                await chrome.storage.local.set({ authToken: accessToken, tokenExpires: expiryTime });
                resolve(accessToken);
            } catch (error) {
                reject(error);
            }
        });
    });
}

// --- Gmail API Interaction ---

async function fetchUnreadMessages(token) {
    const query = 'is:unread from:no-reply from:noreply "verification"';
    const url = `${GMAIL_API_URL}?q=${encodeURIComponent(query)}&maxResults=10`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 401) { // Token likely expired or revoked
        await chrome.storage.local.remove(['authToken', 'tokenExpires']);
        throw new Error("Unauthorized (401). Token may be invalid.");
    }
    if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
    }
    const data = await response.json();
    return data.messages || [];
}

async function getMessageContent(messageId, token) {
    const url = `${GMAIL_API_URL}/${messageId}?format=full`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
    }
    const message = await response.json();

    let body = '';
    if (message.payload.parts) {
        const part = message.payload.parts.find(p => p.mimeType === 'text/plain');
        if (part) {
            body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
    } else if (message.payload.body.data) {
        body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
    return {
        body: body,
        snippet: message.snippet,
        from: message.payload.headers.find(h => h.name === 'From').value
    };
}

// --- OTP Logic & Storage ---

function parseOTP(text) {
    const lowerText = text.toLowerCase();
    if (!OTP_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
        return null;
    }
    const matches = text.match(OTP_REGEX);
    return matches ? matches[0] : null;
}

async function processNewOTP(otp, from) {
    console.log(`Found OTP: ${otp} from: ${from}`);
    const newOTP = { otp, from, timestamp: Date.now() };
    const { otps = [] } = await chrome.storage.local.get('otps');
    const updatedOtps = [newOTP, ...otps].slice(0, 10);
    await chrome.storage.local.set({ otps: updatedOtps });
    await updateBadge();
    sendOTPToActiveTab(otp);
}

// --- Badge & Notifications ---

async function updateBadge() {
    const { otps = [] } = await chrome.storage.local.get('otps');
    const count = otps.length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#008000' : '#808080' });
    if (count > 0) {
        const timeSince = Math.round((Date.now() - otps[0].timestamp) / 60000);
        chrome.action.setTitle({ title: `${count} OTP(s). Newest is ${timeSince} min old.` });
    } else {
        chrome.action.setTitle({ title: 'No OTPs found.' });
    }
}

function sendOTPToActiveTab(otp) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'NEW_OTP', otp: otp });
        }
    });
}

// --- Main Execution Flow ---

async function checkGmailForOTPs() {
    console.log('Checking for OTPs...');
    try {
        const token = await getAuthToken();
        const messages = await fetchUnreadMessages(token);
        for (const message of messages) {
            const content = await getMessageContent(message.id, token);
            const otp = parseOTP(content.body) || parseOTP(content.snippet);
            if (otp) {
                await processNewOTP(otp, content.from);
            }
        }
    } catch (error) {
        console.error('Error checking for OTPs:', error.message);
        // Don't auto-re-authenticate on a loop if there's a persistent problem.
        // User will be prompted to log in on the next check or popup click.
    }
    await updateBadge();
}

// --- Event Listeners ---

// On install, just set up the alarm. The first check will guide to options if needed.
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('gmail-check', {
        delayInMinutes: 1,
        periodInMinutes: CHECK_INTERVAL_MINUTES
    });
    updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'gmail-check') {
        checkGmailForOTPs();
    }
});

// Add a listener for the popup opening. This ensures that if the config is missing,
// the user is prompted immediately when they try to use the extension.
chrome.action.onClicked.addListener(async () => {
    const { clientId } = await chrome.storage.local.get('clientId');
    if (!clientId) {
        chrome.runtime.openOptionsPage();
    }
});

// Initial check on startup
checkGmailForOTPs();
