/**
 * TubeConv - YouTube to MP3 Converter
 * Compact UI JavaScript Application
 */

class TubeConvApp {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.isConverting = false;
        this.currentDownloadUrl = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        
        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();
        
        // Show welcome message
        setTimeout(() => {
            this.showToast('Welcome to TubeConv! Paste a YouTube URL to get started.', 'info', 3000);
        }, 500);
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Input elements
        this.urlInput = document.getElementById('urlInput');
        this.convertBtn = document.getElementById('convertBtn');
        
        // Quality settings
        this.qualityRadios = document.querySelectorAll('input[name="audioQuality"]');
        
        // Section elements
        this.inputSection = document.getElementById('inputSection');
        this.previewSection = document.getElementById('previewSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        
        // Preview elements - DEPRECATED: Direct conversion enabled
        /*
        this.previewThumbnail = document.getElementById('previewThumbnail');
        this.previewTitle = document.getElementById('previewTitle');
        this.previewDuration = document.getElementById('previewDuration');
        this.previewChannel = document.getElementById('previewChannel');
        this.selectedQuality = document.getElementById('selectedQuality');
        this.customTitle = document.getElementById('customTitle');
        this.customArtist = document.getElementById('customArtist');
        this.confirmConversion = document.getElementById('confirmConversion');
        */
        
        // Loading elements
        this.loadingSteps = {
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            step3: document.getElementById('step3')
        };
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.etaTime = document.getElementById('etaTime');
        
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
            setTimeout(() => this.validateUrl(), 10);
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', () => this.handleConvert());
        
        // Quality change
        this.qualityRadios.forEach(radio => {
            radio.addEventListener('change', () => this.saveSettings());
        });
        
        // Preview confirmation - DEPRECATED: Now skipping preview step
        /*
        if (this.confirmConversion) {
            this.confirmConversion.addEventListener('click', () => this.startConversion());
        }
        */
        
        // Result actions
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }
        
        if (this.convertAnotherBtn) {
            this.convertAnotherBtn.addEventListener('click', () => this.resetToInput());
        }
        
        // Error retry
        if (this.tryAgainBtn) {
            this.tryAgainBtn.addEventListener('click', () => this.resetToInput());
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + V to focus input
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && e.target !== this.urlInput) {
                e.preventDefault();
                this.urlInput.focus();
            }
            
            // Enter to convert
            if (e.key === 'Enter' && e.target === this.urlInput && !this.convertBtn.disabled) {
                this.handleConvert();
            }
            
            // Escape to reset
            if (e.key === 'Escape') {
                this.resetToInput();
            }
        });
    }

    /**
     * Validate YouTube URL
     */
    validateUrl() {
        const url = this.urlInput.value.trim();
        const isValid = this.isValidYouTubeUrl(url);
        
        if (this.convertBtn) {
            this.convertBtn.disabled = !isValid;
        }
        
        if (url.length > 0) {
            if (isValid) {
                this.urlInput.classList.remove('error');
                this.urlInput.classList.add('success');
            } else {
                this.urlInput.classList.add('error');
                this.urlInput.classList.remove('success');
            }
        } else {
            this.urlInput.classList.remove('error', 'success');
        }
        
        return isValid;
    }

    /**
     * Check if URL is a valid YouTube URL
     */
    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/,
            /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
            /^https?:\/\/(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]{11}/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Handle convert button click - directly start conversion
     */
    async handleConvert() {
        if (!this.validateUrl() || this.isConverting) return;
        
        const url = this.urlInput.value.trim();
        
        // Start conversion immediately without preview
        await this.startConversion();
    }

    /**
     * Display video preview - DEPRECATED: Direct conversion enabled
     */
    /*
    displayPreview(data) {
        if (this.previewThumbnail) this.previewThumbnail.src = data.thumbnailUrl;
        if (this.previewTitle) this.previewTitle.textContent = data.videoTitle;
        if (this.previewChannel) this.previewChannel.textContent = data.channel;
        if (this.previewDuration) this.previewDuration.textContent = this.formatDuration(data.duration);
        
        const selectedQuality = this.getSelectedQuality();
        if (this.selectedQuality) this.selectedQuality.textContent = `${selectedQuality} kbps`;
        
        // Pre-fill metadata
        if (this.customTitle) this.customTitle.value = data.videoTitle;
        if (this.customArtist) this.customArtist.value = data.channel;
    }
    */

    /**
     * Start conversion process directly
     */
    async startConversion() {
        if (this.isConverting) return;
        
        this.isConverting = true;
        const url = this.urlInput.value.trim();
        const audioQuality = this.getSelectedQuality();
        
        try {
            this.showSection('loading');
            this.resetLoadingSteps();
            this.updateLoadingStep(1, 'active');
            this.updateProgress(0, 'Starting conversion...');
            
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url, 
                    audioQuality,
                    metadata: {
                        title: '', // Will be auto-filled by server
                        artist: '' // Will be auto-filled by server
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Update final progress
            this.updateProgress(100, 'Conversion completed!');
            this.updateLoadingStep(3, 'completed');
            
            setTimeout(() => {
                this.displayResult(data);
                this.showSection('result');
                this.isConverting = false;
                
                // Show success message
                this.showToast('Conversion completed successfully!', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('Conversion failed:', error);
            this.isConverting = false;
            this.showError(error.message || 'Conversion failed. Please try again.');
        }
    }

    /**
     * Simulate conversion progress
     */
    async simulateProgress() {
        // Step 1: Downloading
        this.updateLoadingStep(1, 'active');
        for (let i = 0; i <= 40; i += 5) {
            await this.delay(200);
            this.updateProgress(i, 'Downloading video...');
            this.updateETA(Math.max(1, 8 - Math.floor(i / 5)));
        }
        this.updateLoadingStep(1, 'completed');
        
        // Step 2: Converting
        this.updateLoadingStep(2, 'active');
        for (let i = 40; i <= 80; i += 5) {
            await this.delay(300);
            this.updateProgress(i, 'Converting to MP3...');
            this.updateETA(Math.max(1, 12 - Math.floor(i / 5)));
        }
        this.updateLoadingStep(2, 'completed');
        
        // Step 3: Finalizing
        this.updateLoadingStep(3, 'active');
        for (let i = 80; i <= 100; i += 5) {
            await this.delay(200);
            this.updateProgress(i, 'Finalizing...');
            this.updateETA(Math.max(1, 4 - Math.floor((i - 80) / 5)));
        }
        this.updateLoadingStep(3, 'completed');
        this.updateProgress(100, 'Conversion complete!');
        this.updateETA(0);
    }

    /**
     * Display conversion result
     */
    displayResult(data) {
        if (this.videoThumbnail) this.videoThumbnail.src = data.thumbnailUrl;
        if (this.videoTitle) this.videoTitle.textContent = data.videoTitle;
        if (this.videoDuration) this.videoDuration.textContent = this.formatDuration(data.duration);
        if (this.audioQualityDisplay) this.audioQualityDisplay.textContent = `${data.audioQuality} kbps`;
        
        // Store the download URL for the download button
        this.currentDownloadUrl = data.downloadUrl;
    }

    /**
     * Download the converted file
     */
    downloadFile() {
        if (this.currentDownloadUrl) {
            window.open(this.currentDownloadUrl, '_blank');
            this.showToast('Download started!', 'success');
        }
    }

    /**
     * Show specific section
     */
    showSection(sectionName) {
        const sections = [this.inputSection, this.previewSection, this.loadingSection, this.resultSection, this.errorSection];
        
        sections.forEach(section => {
            if (section) {
                section.classList.remove('visible');
                section.style.display = 'none';
            }
        });
        
        let targetSection;
        switch (sectionName) {
            case 'input':
                targetSection = this.inputSection;
                break;
            // case 'preview': // REMOVED - Direct conversion enabled
            //     targetSection = this.previewSection;
            //     break;
            case 'loading':
                targetSection = this.loadingSection;
                break;
            case 'result':
                targetSection = this.resultSection;
                break;
            case 'error':
                targetSection = this.errorSection;
                break;
        }
        
        if (targetSection) {
            targetSection.style.display = 'flex';
            setTimeout(() => targetSection.classList.add('visible'), 10);
        }
    }

    /**
     * Show error
     */
    showError(message) {
        if (this.errorMessage) this.errorMessage.textContent = message;
        this.showSection('error');
        this.showToast(message, 'error');
    }

    /**
     * Reset to input section
     */
    resetToInput() {
        this.isConverting = false;
        this.currentDownloadUrl = null;
        this.urlInput.value = '';
        this.urlInput.classList.remove('error', 'success');
        this.convertBtn.disabled = true;
        this.showSection('input');
        this.urlInput.focus();
    }

    /**
     * Update loading step status
     */
    updateLoadingStep(stepNumber, status) {
        const step = this.loadingSteps[`step${stepNumber}`];
        if (step) {
            step.classList.remove('active', 'completed');
            if (status) step.classList.add(status);
        }
    }

    /**
     * Reset all loading steps
     */
    resetLoadingSteps() {
        Object.values(this.loadingSteps).forEach(step => {
            if (step) step.classList.remove('active', 'completed');
        });
    }

    /**
     * Update progress bar
     */
    updateProgress(percentage, text) {
        if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
        if (this.progressText) this.progressText.textContent = `${percentage}%`;
        
        if (text) {
            // Update loading text if needed
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = text;
        }
    }

    /**
     * Update ETA display
     */
    updateETA(seconds) {
        if (this.etaTime) {
            this.etaTime.textContent = seconds > 0 ? `${seconds}s` : 'Complete';
        }
    }

    /**
     * Get selected audio quality
     */
    getSelectedQuality() {
        const selected = document.querySelector('input[name="audioQuality"]:checked');
        return selected ? selected.value : '320';
    }

    /**
     * Load user settings
     */
    loadSettings() {
        const savedQuality = localStorage.getItem('audioQuality') || '320';
        const qualityRadio = document.querySelector(`input[name="audioQuality"][value="${savedQuality}"]`);
        if (qualityRadio) {
            qualityRadio.checked = true;
        }
    }

    /**
     * Save user settings
     */
    saveSettings() {
        const selectedQuality = this.getSelectedQuality();
        localStorage.setItem('audioQuality', selectedQuality);
    }

    /**
     * Format duration from seconds
     */
    formatDuration(seconds) {
        if (!seconds) return '--:--';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    /**
     * Create toast container if it doesn't exist
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = new TubeConvApp();
    
    // Make app globally available for debugging
    window.tubeConvApp = app;
    
    // Handle global paste events
    document.addEventListener('paste', async (e) => {
        if (e.target.id === 'urlInput') return;
        
        try {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const urlInput = document.getElementById('urlInput');
            
            if (urlInput && (pastedText.includes('youtube.com') || pastedText.includes('youtu.be'))) {
                urlInput.value = pastedText.trim();
                urlInput.dispatchEvent(new Event('input'));
                urlInput.focus();
                app.showToast('YouTube URL detected and pasted!', 'info');
            }
        } catch (error) {
            console.warn('Failed to handle paste:', error);
        }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
        app.showToast('Connection restored', 'success');
    });
    
    window.addEventListener('offline', () => {
        app.showToast('You are offline. Some features may not work.', 'warning');
    });
});
