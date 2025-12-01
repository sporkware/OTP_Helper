document.addEventListener('DOMContentLoaded', () => {
    const otpList = document.getElementById('otp-list');
    const emptyState = document.getElementById('empty-state');

    chrome.storage.local.get('otps', (data) => {
        const otps = data.otps || [];

        if (otps.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        otps.forEach(otpItem => {
            const listItem = document.createElement('li');
            listItem.className = 'otp-item';

            const timeSince = Math.round((Date.now() - otpItem.timestamp) / 60000);
            const timeText = timeSince < 1 ? 'just now' : `${timeSince} min ago`;

            listItem.innerHTML = `
                <div class="otp-info">
                    <div class="otp-code">${otpItem.otp}</div>
                    <div class="otp-meta">From: ${otpItem.from.split('<')[0].trim()}</div>
                    <div class="otp-meta">Received: ${timeText}</div>
                </div>
                <button class="copy-btn" data-otp="${otpItem.otp}">Copy</button>
            `;
            otpList.appendChild(listItem);
        });

        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const otp = event.target.getAttribute('data-otp');
                navigator.clipboard.writeText(otp).then(() => {
                    event.target.textContent = 'Copied!';
                    setTimeout(() => {
                        event.target.textContent = 'Copy';
                    }, 1000);
                });
            });
        });
    });
});
