document.addEventListener('DOMContentLoaded', () => {
    console.log("Avatar Script Loaded v2 - EdgeTTS");
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const stopBtn = document.getElementById('stop-btn');
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

    // Stop Button Handler
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (audio) {
                audio.pause();
                audio = null;
                setAvatarState('idle');
            }
        });
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // If speaking, stop speech and return (don't send message yet)
        // Or should we send the message? The user said "same function on the send button".
        // The stop button ONLY stops speech. So let's stop speech.
        // If speaking, stop speech and return
        // If speaking, stop speech and return
        if (audio && !audio.paused) {
            audio.pause();
            audio = null;
            setAvatarState('idle');
            return;
        }

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

        // Hide stop button by default
        if (stopBtn) stopBtn.style.display = 'none';
        // Show mic button by default (unless speaking)
        if (micBtn) micBtn.style.display = 'flex';

        switch (state) {
            case 'listening':
                avatarContainer.classList.add('listening');
                micBtn.classList.add('listening');
                avatarStateText.textContent = "Ti ascolto...";
                break;
            case 'speaking':
                avatarContainer.classList.add('speaking');
                avatarStateText.textContent = "Sto parlando...";
                // Show stop button, hide mic button
                if (stopBtn) stopBtn.style.display = 'flex';
                if (micBtn) micBtn.style.display = 'none';
                break;
            case 'thinking':
                avatarStateText.textContent = "Sto pensando...";
                break;
            default: // idle
                avatarStateText.textContent = "Sono qui per aiutarti";
                break;
        }
    }

    let audio = null;

    async function speak(text) {
        // Stop any current audio
        if (audio) {
            audio.pause();
            audio = null;
        }
        setAvatarState('idle');

        // Strip HTML tags
        const plainText = text.replace(/<[^>]*>/g, '');

        try {
            const response = await fetch('/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: plainText }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.audio_url) {
                playAudio(data.audio_url);
            }
        } catch (error) {
            console.error('TTS Error:', error);
            setAvatarState('idle');
        }
    }

    function playAudio(url) {
        audio = new Audio(url);

        audio.onplay = () => {
            setAvatarState('speaking');
        };

        audio.onended = () => {
            setAvatarState('idle');
        };

        audio.onerror = () => {
            console.error('Audio playback error');
            setAvatarState('idle');
        };

        audio.play();
    }
});
