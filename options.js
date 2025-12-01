// options.js

const clientIdInput = document.getElementById('clientId');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load the saved client ID when the page loads
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['clientId'], (result) => {
        if (result.clientId) {
            clientIdInput.value = result.clientId;
        }
    });
});

// Save the client ID
saveButton.addEventListener('click', () => {
    const clientId = clientIdInput.value;
    if (clientId) {
        chrome.storage.local.set({ clientId: clientId }, () => {
            statusDiv.textContent = 'Settings saved!';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
        });
    } else {
        statusDiv.textContent = 'Please enter a valid Client ID.';
        statusDiv.style.color = 'red';
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.style.color = 'green';
        }, 2000);
    }
});
