const vscode = acquireVsCodeApi();
const messages = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        vscode.postMessage({ command: 'askQuestion', text: message });
        messageInput.value = '';
    }
});

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'chatResponse':
            const pre = document.createElement('pre');
            pre.textContent = message.response;
            messages.appendChild(pre);
            messages.scrollTop = messages.scrollHeight;
            break;
    }
});
