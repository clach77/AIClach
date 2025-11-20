document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const sendBtn = document.getElementById('send-btn');

    // Auto-focus input
    userInput.focus();

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message
        appendMessage(message, 'user');
        userInput.value = '';
        userInput.disabled = true;
        sendBtn.disabled = true;

        // Show typing indicator
        const loadingId = showTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            });

            const data = await response.json();

            // Remove typing indicator
            removeTypingIndicator(loadingId);

            // Add bot response
            if (data.response) {
                appendMessage(data.response, 'bot');
            } else {
                appendMessage("Scusa, ho avuto un problema tecnico.", 'bot');
            }

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator(loadingId);
            appendMessage("Non riesco a connettermi al server. Riprova più tardi.", 'bot');
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    });

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // Simple markdown-like parsing for links
        // Replace [text](url) with <a href="url" target="_blank">text</a>
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const formattedText = text.replace(linkRegex, '<a href="$2" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>');

        // Convert newlines to <br>
        messageDiv.innerHTML = formattedText.replace(/\n/g, '<br>');

        chatHistory.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'loading-' + Date.now();
        const indicatorDiv = document.createElement('div');
        indicatorDiv.id = id;
        indicatorDiv.classList.add('typing-indicator');
        indicatorDiv.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        chatHistory.appendChild(indicatorDiv);
        scrollToBottom();
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});
