// Utility to safely get text
const text = el => (el && el.textContent ? el.textContent.trim() : "");

// Safe text encoding function to handle Unicode characters
function safeEncodeText(text) {
  try {
    // First try to encode as UTF-8, then convert to base64
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return btoa(String.fromCharCode(...bytes));
  } catch (error) {
    console.warn('Failed to encode text with UTF-8, falling back to safe encoding:', error);
    // Fallback: remove or replace problematic characters
    const safeText = text.replace(/[^\x00-\x7F]/g, '?');
    return btoa(safeText);
  }
}

// Subject: h2.hP is common, fall back to ARIA heading
function getSubject() {
  const el = document.querySelector("h2.hP") || document.querySelector('[role="heading"][data-thread-perm-id]');
  const subjectText = text(el);
  
  try {
    // Clean the subject text to remove any problematic characters
    const cleanSubject = subjectText
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
      .trim();
    
    return cleanSubject;
  } catch (error) {
    console.warn('Error cleaning subject text:', error);
    return subjectText || "";
  }
}

// Sender: span.gD contains name and attributes for email
function getSender() {
  const el = document.querySelector("span.gD");
  const name = el?.getAttribute("name") || text(el);
  const email = el?.getAttribute("email") || el?.getAttribute("data-hovercard-id") || "";
  
  try {
    // Clean the sender name to remove any problematic characters
    const cleanName = name
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
      .trim();
    
    return { name: cleanName || "", email: email || "" };
  } catch (error) {
    console.warn('Error cleaning sender name:', error);
  return { name: name || "", email: email || "" };
  }
}

// Body: Gmail renders each message body in div.a3s, pick the last visible node
function getBody() {
  const bodies = Array.from(document.querySelectorAll("div.a3s"));
  const last = bodies[bodies.length - 1];
  if (!last) return "";
  
  try {
  // innerText preserves readable text with line breaks
    const bodyText = last.innerText.trim();
    
    // Clean the text to remove any problematic characters
    const cleanText = bodyText
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
    
    return cleanText;
  } catch (error) {
    console.warn('Error extracting body text:', error);
    return "";
  }
}

// Quick sanity check to see if an email view is open
function isMessageOpen() {
  return !!(document.querySelector("h2.hP") || document.querySelector("div.a3s"));
}

// Prevent duplicate execution
if (window.gmailReaderLoaded) {
    console.log('sumurfy widget already loaded, skipping...');
    // Exit early to prevent duplicate execution
    throw new Error('Content script already loaded');
}

// Mark as loaded
window.gmailReaderLoaded = true;

// Ensure the content script is properly loaded
console.log('sumurfy widget loaded - starting initialization');

// Log context information
console.log('Execution context:', {
    location: window.location.href,
    origin: window.location.origin,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
    userAgent: navigator.userAgent,
    isTopFrame: window === window.top,
    frameElement: window.frameElement
});

// Main initialization function
function initializeSumurfy() {
    // Check if we're on the right page
    if (!window.location.href.includes('mail.google.com')) {
        console.log('Not on Gmail, skipping widget creation');
        return;
    }

    // Check if we're in the main frame
    if (window !== window.top) {
        console.log('Running in iframe, skipping widget creation');
        return;
    }

    console.log('On Gmail page and in main frame, proceeding with widget creation');

    // Wait for DOM to be ready
    function initializeWhenReady() {
        if (document.readyState === 'loading') {
            console.log('DOM still loading, waiting...');
            document.addEventListener('DOMContentLoaded', initializeWidget);
        } else {
            console.log('DOM ready, initializing immediately');
            initializeWidget();
        }
    }

    function initializeWidget() {
        console.log('Initializing widget...');
        
        // Create widget immediately
        console.log('Creating widget...');
        createSumurfyWidget();
        
        // Set up email change detection
        setupEmailChangeDetection();
        
        // Auto-generate summary for currently open email if any
        if (isMessageOpen()) {
            console.log('Email already open on page load, auto-generating summary...');
            // Small delay to ensure DOM is fully loaded
            setTimeout(() => {
                if (isMessageOpen()) {
                    console.log('Starting automatic audio generation for open email...');
                    autoReadCurrentEmail();
                }
            }, 1000);
        }
        
        // Check server status after initialization
        setTimeout(() => {
            showServerStatus();
        }, 3000); // Check after 3 seconds
    }

    // Start initialization
    initializeWhenReady();
}

// Start the initialization
initializeSumurfy();


// Create and inject the sumurfy widget
function createSumurfyWidget() {
    console.log('createSumurfyWidget called');
    
    // Check if widget already exists
    if (document.getElementById('sumurfy-widget')) {
        console.log('Widget already exists, skipping creation');
        return;
    }

    console.log('Creating new widget...');

    // Test server connectivity
    fetch('http://localhost:5001/health')
        .then(response => response.json())
        .then(data => {
            console.log('Server health check successful:', data);
        })
        .catch(error => {
            console.error('Server health check failed:', error);
        });

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'sumurfy-widget';
    
    // Create widget HTML with download button above main icon
    widget.innerHTML = `
        <div id="sumurfy-download" class="sumurfy-download">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
        </div>
        <div id="sumurfy-icon" class="sumurfy-icon">
            <div class="icon-text">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
            </div>
        </div>
    `;
    
    // Add widget to page
    document.body.appendChild(widget);
    
    // Set up widget event listeners
    setupWidgetEventListeners();
    
    // Ensure clean initial state
    resetWidgetState();
    
    console.log('sumurfy widget created and injected');
}

// Set up widget event listeners
function setupWidgetEventListeners() {
    const icon = document.getElementById('sumurfy-icon');
    const downloadBtn = document.getElementById('sumurfy-download');
    
    if (icon) {
        icon.addEventListener('click', handleIconClick);
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownloadClick);
    }
}

// Handle icon click - toggle between states
function handleIconClick() {
    const icon = document.getElementById('sumurfy-icon');
    
    if (!icon) return;
    
    console.log('Icon clicked, current state:', {
        hasActiveClass: icon.classList.contains('active'),
        hasLoadingClass: icon.classList.contains('loading'),
        isPlaying: window.isPlaying,
        isPaused: window.isPaused
    });
    
    if (icon.classList.contains('active')) {
        // If already active, handle play/pause
        console.log('Icon is active, handling play/pause...');
        handlePlayPause();
    } else if (icon.classList.contains('loading')) {
        // If currently loading, do nothing (already processing)
        console.log('Audio generation already in progress, ignoring click');
        return;
    } else {
        // First click - start processing and show active state
        console.log('First click - starting email processing...');
        icon.classList.add('active');
        icon.classList.add('loading');
        
        // Force regeneration by clearing existing audio data
        window.speechData = null;
        
        // Start processing and auto-play when ready
        autoReadCurrentEmail();
    }
}

// Handle play/pause button click
function handlePlayPause() {
    if (!window.speechData || !window.speechData.audioFile) {
        return;
    }

    try {
        console.log('handlePlayPause called. Current state:', {
            isPlaying: window.isPlaying,
            isPaused: window.isPaused,
            hasAudio: !!window.currentAudio
        });
        
        if (window.currentAudio && window.isPlaying) {
            // Pause audio
            console.log('Pausing audio...');
            window.currentAudio.pause();
            window.isPlaying = false;
            window.isPaused = true;
            updateIconToPlay(); // Show play button when paused
        } else if (window.currentAudio && window.isPaused) {
            // Resume paused audio
            console.log('Resuming audio...');
            window.currentAudio.play();
            window.isPlaying = true;
            window.isPaused = false;
            updateIconToPause(); // Show pause button when playing
        } else if (window.currentAudio && !window.isPlaying && !window.isPaused) {
            // Audio exists but not in a known state, start playing
            console.log('Starting existing audio...');
            window.currentAudio.play();
            window.isPlaying = true;
            window.isPaused = false;
            updateIconToPause(); // Show pause button when playing
        } else {
            // Create new audio and play
            console.log('Creating new audio and playing...');
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio.currentTime = 0;
            }
            
            window.currentAudio = new Audio(window.speechData.audioFile);
            setupAudioEventListeners(window.currentAudio);
            window.currentAudio.play();
            window.isPlaying = true;
            window.isPaused = false;
            updateIconToPause(); // Show pause button when playing
        }
        
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

// Show download button
function showDownloadButton() {
    const downloadBtn = document.getElementById('sumurfy-download');
    if (downloadBtn) {
        downloadBtn.style.display = 'flex';
    }
}

// Hide download button
function hideDownloadButton() {
    const downloadBtn = document.getElementById('sumurfy-download');
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
}

// Update icon to show play button
function updateIconToPlay() {
    const icon = document.getElementById('sumurfy-icon');
    if (!icon) return;
    
    console.log('Updating icon to PLAY state');
    
    icon.querySelector('.icon-text').innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z"/>
        </svg>
    `;
    
    // No tooltip - clean interface
    icon.removeAttribute('data-tooltip');
    
    // Show download button
    showDownloadButton();
}

// Update icon to show pause button
function updateIconToPause() {
    const icon = document.getElementById('sumurfy-icon');
    if (!icon) {
        console.error('Cannot update icon to pause: icon element not found');
        return;
    }
    
    console.log('Updating icon to PAUSE state');
    
    icon.querySelector('.icon-text').innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
    `;
    
    // No tooltip - clean interface
    icon.removeAttribute('data-tooltip');
    
    // Show download button
    showDownloadButton();
    
    console.log('Icon successfully updated to PAUSE state');
}

// Update icon to show speaker (speaker icon)
function updateIconToSpeaker() {
    const icon = document.getElementById('sumurfy-icon');
    if (!icon) return;
    
    console.log('Updating icon to SPEAKER state');
    
    icon.querySelector('.icon-text').innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="24" height="24" viewBox="0 0 75 75">
            <path d="M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z" style="stroke:#ffffff;stroke-width:5;stroke-linejoin:round;fill:#ffffff;"/>
            <path d="M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6" style="fill:none;stroke:#ffffff;stroke-width:5;stroke-linecap:round"/>
        </svg>
    `;
    
    // Update tooltip - no tooltip for speaker state
    icon.removeAttribute('data-tooltip');
    
    // Hide download button
    hideDownloadButton();
}

// Update circular progress
function updateCircularProgress(progress) {
    const icon = document.getElementById('sumurfy-icon');
    if (!icon) return;
    
    if (progress > 0) {
        icon.classList.add('progress');
        const degrees = (progress * 360);
        
        // Update the conic gradient for progress
        const gradient = `conic-gradient(from -90deg, #ffffff ${degrees}deg, transparent ${degrees}deg)`;
        icon.style.setProperty('--progress-gradient', gradient);
    } else {
        icon.classList.remove('progress');
        icon.style.removeProperty('--progress-gradient');
    }
}

// Set up audio event listeners
function setupAudioEventListeners(audio) {
    audio.addEventListener('loadstart', () => {
        console.log('Loading audio...');
    });
    
    audio.addEventListener('canplay', () => {
        console.log('Audio ready to play');
        // Remove loading state
        const icon = document.getElementById('sumurfy-icon');
        if (icon) {
            icon.classList.remove('loading');
        }
        
        // Auto-start playing and show pause icon
        console.log('Auto-starting audio playback...');
        audio.play().then(() => {
            window.isPlaying = true;
            window.isPaused = false;
            updateIconToPause(); // Show pause icon immediately when playing
            console.log('Audio started playing automatically');
        }).catch(error => {
            console.error('Could not auto-start audio:', error);
            // Fallback to showing play icon if auto-play fails
            updateIconToPlay();
        });
    });
    
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration);
            updateCircularProgress(progress);
        }
    });
    
    audio.addEventListener('ended', () => {
        console.log('Audio playback ended');
        window.isPlaying = false;
        window.isPaused = false;
        const icon = document.getElementById('sumurfy-icon');
        if (icon) {
            updateIconToSpeaker();
            icon.classList.remove('active');
            updateCircularProgress(0);
        }
        
        // Keep download button visible after audio ends
        showDownloadButton();
    });
    
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        window.isPlaying = false;
        window.isPaused = false;
        const icon = document.getElementById('sumurfy-icon');
        if (icon) {
            updateIconToSpeaker();
            icon.classList.remove('active', 'loading');
            updateCircularProgress(0);
        }
        
        // Hide download button on error
        hideDownloadButton();
        
        // No need to clear stored audio data since we're not using blobs
    });
}

// Handle download button click
function handleDownloadClick() {
    if (!window.speechData || !window.speechData.audioFile) {
        console.log('No audio file available for download');
        return;
    }
    
    try {
        console.log('Starting download for:', window.speechData.audioFile);
        
        // Create direct download link
        const link = document.createElement('a');
        link.href = window.speechData.audioFile;
        link.download = `email-summary-${Date.now()}.wav`;
        link.target = '_blank';
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Download initiated successfully for audio file');
        showDownloadSuccess();
        
    } catch (error) {
        console.error('Error downloading audio file:', error);
        showDownloadError();
    }
}

// Show download success feedback
function showDownloadSuccess() {
    const downloadBtn = document.getElementById('sumurfy-download');
    if (downloadBtn) {
        // Temporarily change icon to show success
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        `;
        downloadBtn.style.background = '#4CAF50';
        
        // Reset after 2 seconds
        setTimeout(() => {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.style.background = '';
        }, 2000);
    }
}

// Show download error feedback
function showDownloadError() {
    const downloadBtn = document.getElementById('sumurfy-download');
    if (downloadBtn) {
        // Temporarily change icon to show error
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        `;
        downloadBtn.style.background = '#f44336';
        
        // Reset after 2 seconds
        setTimeout(() => {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.style.background = '';
        }, 2000);
    }
}

// Update progress bar and time display
function updateProgress(currentTime, duration) {
    // This function is no longer needed since we removed the panel
    // Progress is now logged to console for debugging
    if (duration > 0) {
        const progress = (currentTime / duration) * 100;
        console.log(`Audio progress: ${progress.toFixed(1)}% (${formatTime(currentTime)} / ${formatTime(duration)})`);
    }
}

// Format time in MM:SS format
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Display status message in widget
function showStatus(message, isError = false) {
    // Status is now shown through icon state changes instead of text display
    console.log(`Status: ${message}${isError ? ' (ERROR)' : ''}`);
    
    const icon = document.getElementById('sumurfy-icon');
    if (icon && isError) {
        // Show error state briefly
        icon.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)';
        setTimeout(() => {
            if (icon) {
                icon.style.background = '';
            }
        }, 2000);
    }
}

// Auto-read current email
function autoReadCurrentEmail() {
    if (!isMessageOpen()) {
        console.log('No email open, cannot generate summary');
        return;
    }
    
    // Check if audio is already being generated or playing
    if (window.speechData && window.speechData.audioFile) {
        console.log('Audio already available for this email, not regenerating');
        return;
    }
    
    // Set widget to loading state automatically
    const icon = document.getElementById('sumurfy-icon');
    if (icon) {
        icon.classList.add('active');
        icon.classList.add('loading');
    }
    
    console.log('Auto-generating summary for current email...');
    
    // Extract email data
    const subject = getSubject();
    const sender = getSender();
    const body = getBody();
    
    console.log('Extracted email data:', { subject, sender, body });
    
    if (!subject && !sender.name && !body) {
        console.log('Could not read this email. Gmail layout may have changed or the message is still loading.');
        // Reset icon state on error
        if (icon) {
            icon.classList.remove('active', 'loading');
        }
        return;
    }
    
    // Generate summary with extracted data
    generateSummary({ subject, sender, body });
}

// Generate AI summary
async function generateSummary(emailData) {
    try {
        console.log('Starting summary generation...');
        showStatus('Starting summary generation...');
        
        console.log('Email data:', emailData);
        
        const emailContent = `Subject: ${emailData.subject}\nFrom: ${emailData.sender.name}${emailData.sender.email ? ` <${emailData.sender.email}>` : ''}\n\n${emailData.body}`;
        
        console.log('Making request to server...');
        showStatus('Connecting to server...');
        
        console.log('URL: http://localhost:5001/summarize');
        
        // Test server connectivity first with better error handling
        let serverAvailable = false;
        try {
            console.log('Testing server connectivity...');
            const testResponse = await fetch('http://localhost:5001/health', {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (testResponse.ok) {
                console.log('Connectivity test successful:', testResponse.status);
                showStatus('Server connected, generating summary...');
                serverAvailable = true;
            } else {
                throw new Error(`Server responded with status: ${testResponse.status}`);
            }
        } catch (testError) {
            console.error('Connectivity test failed:', testError);
            
            // Check if it's a CORS or network error
            if (testError.name === 'TypeError' && testError.message.includes('Failed to fetch')) {
                console.log('Network error detected - likely server not running or CORS issue');
                showStatus('Server not accessible. Please ensure the Flask server is running on localhost:5001', true);
                
                // Try to provide helpful instructions
                const icon = document.getElementById('sumurfy-icon');
                if (icon) {
                    icon.classList.remove('loading');
                    icon.classList.remove('active');
                    updateIconToSpeaker();
                }
                
                throw new Error('Server not accessible. Please start the Flask server with: python server.py');
            }
            
            // Try XMLHttpRequest as fallback
            try {
                console.log('Trying XMLHttpRequest fallback...');
                const xhr = new XMLHttpRequest();
                xhr.timeout = 5000; // 5 second timeout
                xhr.open('GET', 'http://localhost:5001/health', false); // Synchronous for testing
                xhr.send();
                if (xhr.status === 200) {
                    console.log('XMLHttpRequest fallback successful:', xhr.status);
                    showStatus('Server connected, generating summary...');
                    serverAvailable = true;
                } else {
                    throw new Error(`XMLHttpRequest failed: ${xhr.status}`);
                }
            } catch (xhrError) {
                console.error('XMLHttpRequest fallback also failed:', xhrError);
                showStatus('Cannot connect to server. Please check if the server is running.', true);
                throw new Error(`Cannot connect to server: ${testError.message}`);
            }
        }
        
        if (!serverAvailable) {
            throw new Error('Server is not available');
        }
        
        // Add retry mechanism with exponential backoff
        let retries = 3;
        let response;
        let lastError;
        
        while (retries > 0) {
            try {
                console.log(`Attempt ${4 - retries}/3: Making request to server...`);
                
                response = await fetch('http://localhost:5001/summarize', {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        email_content: emailContent,
                        voice_id: 'en-US-natalie'
                    }),
                    timeout: 30000 // 30 second timeout for the main request
                });
                
                console.log('Response received:', response);
                console.log('Response status:', response.status);
                
                if (response.ok) {
                    break; // Success, exit retry loop
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
            } catch (fetchError) {
                lastError = fetchError;
                retries--;
                console.warn(`Fetch attempt failed, retries left: ${retries}`, fetchError);
                
                if (retries > 0) {
                    const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff: 1s, 2s, 4s
                    showStatus(`Connection failed, retrying in ${delay/1000}s... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw fetchError;
                }
            }
        }

        if (!response || !response.ok) {
            throw new Error(`All retry attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
        }

        console.log('Response headers:', response.headers);

        const result = await response.json();
        console.log('Response JSON:', result);

        if (result.success) {
            // Remove loading from icon
            const icon = document.getElementById('sumurfy-icon');
            if (icon) {
                icon.classList.remove('loading');
            }
            
            showStatus('Summary generated successfully!');
            
            // Handle speech result
            if (result.speech && result.speech.audioFile) {
                window.speechData = result.speech;
                console.log('Audio ready to play:', result.speech.audioFile);
                showStatus('Audio ready to play!');
                
                // Show play icon to indicate audio is ready
                if (icon) {
                    updateIconToSpeaker();
                }
                
                // Show play icon (ready to play)
                updateIconToPlay();
            }
            
        } else {
            // Remove loading from icon on error
            const icon = document.getElementById('sumurfy-icon');
            if (icon) {
                icon.classList.remove('loading');
                icon.classList.remove('active');
                updateIconToSpeaker();
                updateCircularProgress(0);
            }
            
            console.error('Summary failed:', result.error);
            showStatus(`Summary failed: ${result.error}`, true);
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        showStatus(`Error: ${error.message}`, true);
        
        // Remove loading from icon on error
        const icon = document.getElementById('sumurfy-icon');
        if (icon) {
            icon.classList.remove('loading');
            icon.classList.remove('active');
            updateIconToSpeaker();
            updateCircularProgress(0);
        }
    }
}

// Check if server is running and accessible
async function checkServerStatus() {
    try {
        const response = await fetch('http://localhost:5001/health', {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (response.ok) {
            console.log('Server is running and accessible');
            return true;
        } else {
            console.log('Server responded but with error status:', response.status);
            return false;
        }
    } catch (error) {
        console.log('Server is not accessible:', error.message);
        return false;
    }
}

// Show server status to user
function showServerStatus() {
    const icon = document.getElementById('sumurfy-icon');
    if (!icon) return;
    
    checkServerStatus().then(isRunning => {
        if (!isRunning) {
            // Show helpful message in the icon
            icon.querySelector('.icon-text').innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            `;
            
            // No tooltip - clean interface
            icon.removeAttribute('data-tooltip');
            icon.style.background = '#666666';
            icon.style.cursor = 'help';
        } else {
            // Reset to normal state
            updateIconToSpeaker();
            icon.style.background = '';
            icon.style.cursor = 'pointer';
        }
    });
}

// Reset widget state to initial microphone state
function resetWidgetState() {
    const icon = document.getElementById('sumurfy-icon');
    if (icon) {
        icon.classList.remove('active', 'loading', 'progress');
    }
    
    // Reset audio state
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
        window.currentAudio = null;
    }
    
    // Reset play/pause state
    window.isPlaying = false;
    window.isPaused = false;
    
    // Reset progress
    updateCircularProgress(0);
    
    // Show microphone icon
    updateIconToSpeaker();
    
    // Hide download button
    hideDownloadButton();
    
    console.log('Widget state reset to microphone');
}


// Respond to popup requests (for backward compatibility)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.type === "PING") {
    // Simple ping to check if content script is loaded
    sendResponse({ ok: true, message: "Content script is loaded" });
    return true;
  }
  
  if (request.type === "EXTRACT_EMAIL") {
    try {
    if (!isMessageOpen()) {
      sendResponse({
        ok: false,
        error: "No email open. Open a message in Gmail and try again."
      });
      return true;
    }
      
    const subject = getSubject();
    const sender = getSender();
    const body = getBody();

      console.log('Extracted data:', { subject, sender, body });

    if (!subject && !sender.name && !body) {
      sendResponse({
        ok: false,
        error: "Could not read this email. Gmail layout may have changed or the message is still loading."
      });
      return true;
    }

    sendResponse({
      ok: true,
      data: { subject, sender, body }
    });
    return true;
    } catch (error) {
      console.error('Error extracting email:', error);
      sendResponse({
        ok: false,
        error: `Error reading email: ${error.message}`
      });
      return true;
    }
  }
  
  // Always return true to indicate we'll send a response asynchronously
  return true;
});

// Set up email change detection
function setupEmailChangeDetection() {
    console.log('Setting up email change detection...');
    
    // Store current email identifier
    let currentEmailId = getCurrentEmailId();
    
    // Function to get current email identifier
    function getCurrentEmailId() {
        // Check if any email is currently open
        if (!isMessageOpen()) {
            return 'no-email';
        }
        
        // Try to get email ID from URL or DOM elements
        const urlParams = new URLSearchParams(window.location.search);
        const messageId = urlParams.get('th') || urlParams.get('message_id');
        
        if (messageId) {
            return messageId;
        }
        
        // Fallback: try to get from DOM elements
        const subjectEl = document.querySelector("h2.hP") || document.querySelector('[role="heading"][data-thread-perm-id]');
        const senderEl = document.querySelector("span.gD");
        
        if (subjectEl && senderEl) {
            const subject = text(subjectEl);
            const sender = text(senderEl);
            return `${subject}-${sender}`;
        }
        
        return 'no-email';
    }
    
    // Function to reset widget state
    function resetWidgetStateForEmailChange() {
        console.log('Email changed, resetting widget state...');
        
        // Use the comprehensive reset function
        resetWidgetState();
    }
    
    // Check for email changes periodically
    function checkForEmailChange() {
        const newEmailId = getCurrentEmailId();
        
        if (newEmailId !== currentEmailId) {
            console.log('Email change detected:', { from: currentEmailId, to: newEmailId });
            currentEmailId = newEmailId;
            resetWidgetStateForEmailChange();
            
            // Auto-generate summary for new email if it's a valid email
            if (newEmailId !== 'no-email') {
                console.log('Auto-generating summary for new email...');
                // Small delay to ensure DOM is fully updated
                setTimeout(() => {
                    if (isMessageOpen()) {
                        autoReadCurrentEmail();
                    }
                }, 1000);
            }
        }
    }
    
    // Set up periodic checking
    setInterval(checkForEmailChange, 1000);
    
    // Also listen for Gmail navigation events
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Check if navigation occurred
                const hasNewEmail = mutation.addedNodes.length > 0 && 
                    Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.querySelector && (
                            node.querySelector("h2.hP") || 
                            node.querySelector('[role="heading"][data-thread-perm-id]') ||
                            node.querySelector("span.gD")
                        ))
                    );
                
                if (hasNewEmail) {
                    // Small delay to ensure DOM is updated
                    setTimeout(checkForEmailChange, 500);
                }
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Email change detection set up');
}