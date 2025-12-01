// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'NEW_OTP') {
        console.log('OTP received by content script:', request.otp);
        fillOtpInput(request.otp);
    }
});

function fillOtpInput(otp) {
    // Heuristics to find the OTP input field
    const selectors = [
        'input[autocomplete="one-time-code"]',
        'input[id*="otp"]', 'input[name*="otp"]',
        'input[id*="code"]', 'input[name*="code"]',
        'input[id*="verification"]', 'input[name*="verification"]',
        'input[id*="mfa"]', 'input[name*="mfa"]',
        'input[id*="2fa"]', 'input[name*="2fa"]',
        `input[maxlength="${otp.length}"]`
    ];

    let targetInput = null;

    for (const selector of selectors) {
        try {
            const inputs = document.querySelectorAll(selector);
            // Find the first visible input
            for (const input of inputs) {
                if (input.offsetParent !== null) { // Check if it's visible
                    targetInput = input;
                    break;
                }
            }
            if (targetInput) break;
        } catch (error) {
            // Invalid selector might throw an error, so we catch and continue
            console.warn(`Invalid selector: ${selector}`);
        }
    }

    if (targetInput) {
        console.log('Found OTP input field:', targetInput);
        targetInput.value = otp;
        // Optionally, you could also try to submit the form
        // targetInput.form.submit();
    } else {
        console.log('No suitable OTP input field found on this page.');
    }
}
