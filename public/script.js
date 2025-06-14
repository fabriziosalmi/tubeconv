/**
 * TubeConv - YouTube to MP3 Converter
 * Frontend JavaScript Application
 */

class TubeConvApp {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.currentSection = 'input';
        this.isConverting = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Input elements
        this.urlInput = document.getElementById('urlInput');
        this.convertBtn = document.getElementById('convertBtn');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsPanel = document.getElementById('settingsPanel');
        
        // Settings elements
        this.qualityRadios = document.querySelectorAll('input[name="audioQuality"]');
        this.customTitle = document.getElementById('customTitle');
        this.customArtist = document.getElementById('customArtist');
        
        // Section elements
        this.inputSection = document.getElementById('inputSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        
        // Loading elements
        this.loadingSteps = {
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            step3: document.getElementById('step3')
        };
        
        // Result elements
        this.videoThumbnail = document.getElementById('videoThumbnail');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoDuration = document.getElementById('videoDuration');
        this.audioQualityDisplay = document.getElementById('audioQualityDisplay');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.convertAnotherBtn = document.getElementById('convertAnotherBtn');
        
        // Error elements
        this.errorMessage = document.getElementById('errorMessage');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Input events
        this.urlInput.addEventListener('input', () => this.validateUrl());
        this.urlInput.addEventListener('paste', () => {
            // Slight delay to allow paste content to be processed
            setTimeout(() => this.validateUrl(), 10);
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', () => this.handleConvert());
        
        // Settings toggle
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        
        // Settings change
        this.qualityRadios.forEach(radio => {
            radio.addEventListener('change', () => this.saveSettings());
        });
        
        // Download button
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        
        // Convert another button
        this.convertAnotherBtn.addEventListener('click', () => this.resetToInput());
        
        // Try again button
        this.tryAgainBtn.addEventListener('click', () => this.resetToInput());
        
        // Enter key support
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.convertBtn.disabled) {
                this.handleConvert();
            }
        });
        
        // Auto-detect YouTube URL pattern
        this.urlInput.addEventListener('input', () => {
            this.autoDetectUrl();
        });
    }

    /**
     * Validate YouTube URL
     */
    validateUrl() {
        const url = this.urlInput.value.trim();
        const isValid = this.isValidYouTubeUrl(url);
        
        this.convertBtn.disabled = !isValid || this.isConverting;
        
        if (isValid) {
            this.urlInput.classList.remove('error');
            this.convertBtn.classList.add('active');
        } else {
            this.urlInput.classList.add('error');
            this.convertBtn.classList.remove('active');
        }
    }

    /**
     * Check if URL is a valid YouTube URL
     */
    isValidYouTubeUrl(url) {
        if (!url) return false;
        
        const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
        return regex.test(url);
    }

    /**
     * Auto-detect and enhance URL input
     */
    autoDetectUrl() {
        const url = this.urlInput.value.trim();
        
        // If user starts typing a YouTube URL, show helpful hint
        if (url.length > 0 && url.includes('youtube') && !this.isValidYouTubeUrl(url)) {
            this.urlInput.setAttribute('title', 'Please enter a complete YouTube URL');
        } else {
            this.urlInput.removeAttribute('title');
        }
    }

    /**
     * Toggle settings panel
     */
    toggleSettings() {
        this.settingsPanel.classList.toggle('open');
        
        // Update toggle button appearance
        if (this.settingsPanel.classList.contains('open')) {
            this.settingsToggle.style.color = 'var(--primary-color)';
        } else {
            this.settingsToggle.style.color = '';
        }
    }

    /**
     * Get selected audio quality
     */
    getSelectedQuality() {
        const selectedRadio = document.querySelector('input[name="audioQuality"]:checked');
        return selectedRadio ? selectedRadio.value : '320';
    }

    /**
     * Get metadata settings
     */
    getMetadata() {
        const metadata = {};
        
        if (this.customTitle.value.trim()) {
            metadata.title = this.customTitle.value.trim();
        }
        
        if (this.customArtist.value.trim()) {
            metadata.artist = this.customArtist.value.trim();
        }
        
        return metadata;
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        const settings = {
            audioQuality: this.getSelectedQuality(),
            metadata: this.getMetadata()
        };
        
        localStorage.setItem('tubeconv-settings', JSON.stringify(settings));
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('tubeconv-settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // Set audio quality
                if (settings.audioQuality) {
                    const qualityRadio = document.querySelector(`input[name="audioQuality"][value="${settings.audioQuality}"]`);
                    if (qualityRadio) {
                        qualityRadio.checked = true;
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    /**
     * Show specific section
     */
    showSection(sectionName) {
        // Hide all sections
        this.inputSection.style.display = 'none';
        this.loadingSection.classList.remove('visible');
        this.resultSection.classList.remove('visible');
        this.errorSection.classList.remove('visible');
        
        // Show requested section
        switch (sectionName) {
            case 'input':
                this.inputSection.style.display = 'block';
                break;
            case 'loading':
                this.loadingSection.classList.add('visible');
                break;
            case 'result':
                this.resultSection.classList.add('visible');
                break;
            case 'error':
                this.errorSection.classList.add('visible');
                break;
        }
        
        this.currentSection = sectionName;
    }

    /**
     * Update loading step
     */
    updateLoadingStep(stepNumber) {
        // Reset all steps
        Object.values(this.loadingSteps).forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        // Mark completed steps
        for (let i = 1; i < stepNumber; i++) {
            this.loadingSteps[`step${i}`].classList.add('completed');
        }
        
        // Mark current step as active
        if (stepNumber <= 3) {
            this.loadingSteps[`step${stepNumber}`].classList.add('active');
        }
    }

    /**
     * Handle convert button click
     */
    async handleConvert() {
        if (this.isConverting) return;
        
        const url = this.urlInput.value.trim();
        if (!this.isValidYouTubeUrl(url)) {
            this.showError('Please enter a valid YouTube URL');
            return;
        }
        
        this.isConverting = true;
        this.convertBtn.disabled = true;
        
        try {
            await this.convertVideo(url);
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError(error.message || 'An unexpected error occurred');
        } finally {
            this.isConverting = false;
        }
    }

    /**
     * Convert video using API
     */
    async convertVideo(url) {
        // Show loading section
        this.showSection('loading');
        this.updateLoadingStep(1);
        
        // Prepare request data
        const requestData = {
            url: url,
            audioQuality: this.getSelectedQuality(),
            metadata: this.getMetadata()
        };
        
        try {
            // Make API request
            const response = await fetch(`${this.apiBaseUrl}/api/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (!data.success) {
                throw new Error(data.error || 'Conversion failed');
            }
            
            // Simulate progress through steps
            this.updateLoadingStep(2);
            await this.sleep(1000);
            
            this.updateLoadingStep(3);
            await this.sleep(1000);
            
            // Show result
            this.showResult(data);
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to server. Please check your connection and try again.');
            }
            throw error;
        }
    }

    /**
     * Show conversion result
     */
    showResult(data) {
        // Update video information
        this.videoThumbnail.src = data.thumbnailUrl;
        this.videoThumbnail.alt = data.videoTitle;
        this.videoTitle.textContent = data.videoTitle;
        this.videoDuration.textContent = data.duration;
        this.audioQualityDisplay.textContent = `${data.audioQuality} kbps`;
        
        // Store download URL
        this.downloadUrl = data.downloadUrl;
        
        // Show result section
        this.showSection('result');
    }

    /**
     * Handle download button click
     */
    handleDownload() {
        if (!this.downloadUrl) {
            this.showError('Download URL not available');
            return;
        }
        
        // Create temporary link element for download
        const link = document.createElement('a');
        link.href = this.downloadUrl;
        link.download = ''; // Let browser determine filename
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show download feedback
        this.showDownloadFeedback();
    }

    /**
     * Show download feedback
     */
    showDownloadFeedback() {
        const originalText = this.downloadBtn.innerHTML;
        this.downloadBtn.innerHTML = `
            <svg class="download-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 10L9 12L13 8" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            Download Started
        `;
        this.downloadBtn.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            this.downloadBtn.innerHTML = originalText;
            this.downloadBtn.style.background = '';
        }, 3000);
    }

    /**
     * Reset to input section
     */
    resetToInput() {
        // Clear form
        this.urlInput.value = '';
        this.customTitle.value = '';
        this.customArtist.value = '';
        
        // Reset state
        this.downloadUrl = null;
        this.isConverting = false;
        this.convertBtn.disabled = true;
        this.convertBtn.classList.remove('active');
        
        // Close settings if open
        this.settingsPanel.classList.remove('open');
        this.settingsToggle.style.color = '';
        
        // Show input section
        this.showSection('input');
        
        // Focus input
        this.urlInput.focus();
    }

    /**
     * Show error message
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.showSection('error');
    }

    /**
     * Utility function to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle network errors gracefully
     */
    handleNetworkError(error) {
        console.error('Network error:', error);
        
        if (error.message.includes('Failed to fetch')) {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }
        
        if (error.message.includes('NetworkError')) {
            return 'Network error occurred. Please try again later.';
        }
        
        return error.message || 'An unexpected error occurred. Please try again.';
    }
}

/**
 * Utility functions
 */

// Format duration from seconds to MM:SS format
function formatDuration(duration) {
    if (!duration) return 'Unknown';
    
    // Handle various duration formats that yt-dlp might return
    if (typeof duration === 'string') {
        return duration; // Assume it's already formatted
    }
    
    if (typeof duration === 'number') {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return 'Unknown';
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.warn('Failed to copy to clipboard:', error);
        return false;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: var(--spacing-md) var(--spacing-lg);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-primary);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform var(--transition-normal);
            max-width: 300px;
        `;
        document.body.appendChild(toast);
    }
    
    // Set message and show
    toast.textContent = message;
    toast.style.transform = 'translateX(0)';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
    }, 3000);
}

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    const app = new TubeConvApp();
    
    // Make app available globally for debugging
    window.TubeConvApp = app;
    
    // Add some helpful console messages
    console.log('%c🎵 TubeConv - YouTube to MP3 Converter', 'color: #667eea; font-size: 16px; font-weight: bold;');
    console.log('%cApplication initialized successfully!', 'color: #10b981;');
    
    // Service worker registration (for future PWA features)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('Service Worker registration failed:', error);
        });
    }
});

/**
 * Handle online/offline status
 */
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may not work.', 'warning');
});

/**
 * Prevent form submission on Enter key (already handled by keypress event)
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
    }
});

/**
 * Handle paste events globally for better UX
 */
document.addEventListener('paste', async (e) => {
    if (e.target.id === 'urlInput') return; // Already handled
    
    try {
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const urlInput = document.getElementById('urlInput');
        
        if (urlInput && pastedText.includes('youtube.com') || pastedText.includes('youtu.be')) {
            urlInput.value = pastedText.trim();
            urlInput.dispatchEvent(new Event('input'));
            urlInput.focus();
            showToast('YouTube URL detected and pasted!');
        }
    } catch (error) {
        console.warn('Failed to handle paste:', error);
    }
});
