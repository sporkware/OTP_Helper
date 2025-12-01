// background.js

// --- Constants and State ---

const GMAIL_API_URL = 'https://www.googleapis.com/gmail/v1/users/me/messages';
const CHECK_INTERVAL_MINUTES = 1;
const OTP_REGEX = /\b(\d{6,8})\b/g; // Look for 6-8 digit numbers
const OTP_KEYWORDS = ['verification code', 'otp', 'one-time password', 'authentication code', 'security code'];

// --- Authentication ---

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
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

// --- OTP Logic ---

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
  const newOTP = {
    otp,
    from,
    timestamp: Date.now()
  };

  // Store the OTP
  const { otps = [] } = await chrome.storage.local.get('otps');
  // Add new OTP to the front and keep the list at a max of 10
  const updatedOtps = [newOTP, ...otps].slice(0, 10);
  await chrome.storage.local.set({ otps: updatedOtps });

  // Update badge
  await updateBadge();

  // Notify content script
  sendOTPToActiveTab(otp);
}


// --- Badge Management ---

async function updateBadge() {
    const { otps = [] } = await chrome.storage.local.get('otps');
    const count = otps.length;

    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#008000' : '#808080' }); // Green if OTPs, Gray if not

    if (count > 0) {
        const timeSince = Math.round((Date.now() - otps[0].timestamp) / 60000);
        chrome.action.setTitle({ title: `${count} OTP(s). Newest is ${timeSince} min old.` });
    } else {
        chrome.action.setTitle({ title: 'No OTPs found.' });
    }
}


// --- Content Script Communication ---

function sendOTPToActiveTab(otp) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'NEW_OTP', otp: otp });
        }
    });
}


// --- Main Execution Flow ---

async function checkGmailForOTPs() {
  console.log('Checking for OTPs...');
  try {
    const token = await getAuthToken(false);
    const messages = await fetchUnreadMessages(token);

    for (const message of messages) {
      const content = await getMessageContent(message.id, token);
      const otp = parseOTP(content.body) || parseOTP(content.snippet);

      if (otp) {
        await processNewOTP(otp, content.from);
        // We don't mark as read to let the user see the email.
        // For a fully automated system, you could add a call here to mark the email as read.
      }
    }
  } catch (error) {
    console.error('Error checking for OTPs:', error);
    // If token is expired or revoked, getAuthToken(true) will prompt the user to log in again.
    if (error.message.includes('401')) {
        await getAuthToken(true);
    }
  }
  await updateBadge();
}


// --- Event Listeners ---

// On install, prompt user to log in and set up the alarm
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        try {
            await getAuthToken(true);
            console.log('First-time authentication successful.');
        } catch (error) {
            console.error('First-time authentication failed:', error);
        }
    }
    chrome.alarms.create('gmail-check', {
        delayInMinutes: 1,
        periodInMinutes: CHECK_INTERVAL_MINUTES
    });
    await updateBadge();
});

// Listener for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'gmail-check') {
        checkGmailForOTPs();
    }
});

// Initial check when the extension starts
checkGmailForOTPs();
