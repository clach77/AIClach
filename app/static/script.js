document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const avatarContainer = document.getElementById('avatar-container');
    const avatarStateText = document.getElementById('avatar-state-text');

    // Voice API Support Check
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synthesis = window.speechSynthesis;
    let recognition = null;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setAvatarState('listening');
        };

        recognition.onend = () => {
            if (avatarContainer.classList.contains('listening')) {
                setAvatarState('idle');
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            chatForm.dispatchEvent(new Event('submit'));
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setAvatarState('idle');
        };
    } else {
        micBtn.style.display = 'none';
        console.warn('Speech Recognition API not supported');
    }

    // Auto-focus input
    userInput.focus();

    // Mic Button Handler
    if (micBtn && recognition) {
        micBtn.addEventListener('click', () => {
            if (avatarContainer.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    }

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
        setAvatarState('thinking');

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
                speak(data.response);
            } else {
                const errorMsg = "Scusa, ho avuto un problema tecnico.";
                appendMessage(errorMsg, 'bot');
                speak(errorMsg);
            }

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator(loadingId);
            const errorMsg = "Non riesco a connettermi al server. Riprova più tardi.";
            appendMessage(errorMsg, 'bot');
            speak(errorMsg);
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
            if (!avatarContainer.classList.contains('speaking')) {
                setAvatarState('idle');
            }
        }
    });

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // Simple markdown-like parsing for links
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const formattedText = text.replace(linkRegex, '<a href="$2" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>');

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

    function setAvatarState(state) {
        // Reset classes
        avatarContainer.classList.remove('listening', 'speaking', 'thinking');
        micBtn.classList.remove('listening');

        switch (state) {
            case 'listening':
                avatarContainer.classList.add('listening');
                micBtn.classList.add('listening');
                avatarStateText.textContent = "Ti ascolto...";
                break;
            case 'speaking':
                avatarContainer.classList.add('speaking');
                avatarStateText.textContent = "Sto parlando...";
                break;
            case 'thinking':
                avatarStateText.textContent = "Sto pensando...";
                break;
            default: // idle
                avatarStateText.textContent = "Sono qui per aiutarti";
                break;
        }
    }

    function speak(text) {
        if (!synthesis) return;

        // Cancel any current speech
        synthesis.cancel();

        // Strip HTML tags for speech
        const plainText = text.replace(/<[^>]*>/g, '');

        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setAvatarState('speaking');
        };

        utterance.onend = () => {
            setAvatarState('idle');
        };

        utterance.onerror = () => {
            setAvatarState('idle');
        };

        synthesis.speak(utterance);
    }
});
