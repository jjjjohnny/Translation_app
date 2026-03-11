const micBtn = document.getElementById('mic-btn');
const langToggle = document.getElementById('lang-toggle');
const fromLangLabel = document.getElementById('from-lang');
const toLangLabel = document.getElementById('to-lang');
const inputTextDisplay = document.getElementById('input-text');
const outputTextDisplay = document.getElementById('output-text');
const statusText = document.getElementById('status-text');
const liveSubtitle = document.getElementById('live-translation');
const video = document.getElementById('webcam');

// Initialize Camera
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam:", err);
        statusText.innerText = "Camera access denied. Please allow camera to see your face!";
    }
}
initCamera();

let isListening = false;
let recognition;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        statusText.innerText = "Listening... Speak now";
        inputTextDisplay.innerText = "Wait for it...";
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        statusText.innerText = "Stopped. Click to speak again";
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
            inputTextDisplay.innerText = currentText;
            
            // Periodically translate if there's final text
            if (finalTranscript) {
                translateText(finalTranscript);
            }
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        statusText.innerText = `Error: ${event.error}`;
        stopListening();
    };
} else {
    statusText.innerText = "Speech Recognition not supported in this browser.";
    micBtn.disabled = true;
}

// Language Configuration
const getLangs = () => {
    // If checked, it's Finnish to English
    if (langToggle.checked) {
        return { from: 'fi-FI', to: 'en-GB' };
    }
    // Default: English to Finnish
    return { from: 'en-US', to: 'fi-FI' };
};

const updateLabels = () => {
    const { from, to } = getLangs();
    if (langToggle.checked) {
        fromLangLabel.innerText = "Finnish";
        toLangLabel.innerText = "English";
        fromLangLabel.classList.add('active');
        toLangLabel.classList.remove('active');
    } else {
        fromLangLabel.innerText = "English";
        toLangLabel.innerText = "Finnish";
        fromLangLabel.classList.add('active');
        toLangLabel.classList.remove('active');
    }
    
    // If we're already listening, restart with new language
    if (isListening) {
        stopListening();
        setTimeout(startListening, 300);
    }
};

langToggle.addEventListener('change', updateLabels);
// Initial label state
updateLabels();

// Translation Logic
async function translateText(text) {
    const { from, to } = getLangs();
    const fromCode = from.split('-')[0];
    const toCode = to.split('-')[0];
    
    statusText.innerText = "Translating...";
    
    try {
        // Using MyMemory API (Free, no key needed for small chunks)
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromCode}|${toCode}`);
        const data = await response.json();
        
        if (data.responseData && data.responseData.translatedText) {
            const translated = data.responseData.translatedText;
            outputTextDisplay.innerText = translated;
            liveSubtitle.innerText = translated; // Update video overlay
            statusText.innerText = "Listening...";
        } else {
            throw new Error("Translation failed");
        }
    } catch (error) {
        console.error("Translation error:", error);
        outputTextDisplay.innerText = "Error in translation.";
        statusText.innerText = "Listening...";
    }
}

function startListening() {
    const { from } = getLangs();
    recognition.lang = from;
    recognition.start();
}

function stopListening() {
    recognition.stop();
}

micBtn.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});
