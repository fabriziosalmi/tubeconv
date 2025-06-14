/**
 * TubeConv - YouTube to MP3 Converter
 * Frontend JavaScript Application
 */

// Navigation Manager
class NavigationManager {
    constructor() {
        this.currentSection = 'input';
        this.sections = ['input', 'api', 'features', 'status'];
        this.initializeNavigation();
    }

    initializeNavigation() {
        // Initialize navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Initialize mobile nav toggle
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('open');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu && !navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('open');
            }
        });

        // Initialize sections
        this.showSection('input');
    }

    showSection(sectionName) {
        // Update current section
        this.currentSection = sectionName;

        // Hide all sections
        const allSections = document.querySelectorAll('.page-section, .input-section, .preview-section, .loading-section, .result-section, .error-section');
        allSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Show target section
        let targetSection;
        switch (sectionName) {
            case 'input':
                targetSection = document.getElementById('inputSection');
                break;
            case 'api':
                targetSection = document.getElementById('apiSection');
                break;
            case 'features':
                targetSection = document.getElementById('featuresSection');
                break;
            case 'status':
                targetSection = document.getElementById('statusSection');
                // Load status data when showing status section
                setTimeout(() => this.loadStatusData(), 100);
                break;
        }

        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        }

        // Update nav link states
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

        // Close mobile menu
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.classList.remove('open');
        }

        // Update URL hash
        window.history.replaceState(null, null, `#${sectionName}`);
    }

    async loadStatusData() {
        try {
            // Load API health data
            const healthResponse = await fetch('/api/health');
            const healthData = await healthResponse.json();
            
            this.updateApiStatus(healthData);
            
            // Load system status data
            const statusResponse = await fetch('/api/status');
            const statusData = await statusResponse.json();
            
            this.updateSystemStatus(statusData);
            
        } catch (error) {
            console.error('Failed to load status data:', error);
            this.updateApiStatus({ status: 'error', message: 'Failed to connect' });
        }
    }

    updateApiStatus(data) {
        const statusIndicator = document.getElementById('apiStatus');
        const statusDetails = document.getElementById('apiDetails');
        
        if (statusIndicator) {
            const statusDot = statusIndicator.querySelector('.status-dot');
            const statusText = statusIndicator.querySelector('.status-text');
            
            if (data.status === 'healthy') {
                statusDot.className = 'status-dot active';
                statusText.textContent = 'Operational';
            } else {
                statusDot.className = 'status-dot error';
                statusText.textContent = 'Issues Detected';
            }
        }

        // Update detailed status
        if (data.details) {
            const uptimeValue = document.getElementById('uptimeValue');
            const memoryValue = document.getElementById('memoryValue');
            const nodeVersion = document.getElementById('nodeVersion');

            if (uptimeValue && data.details.uptime) {
                uptimeValue.textContent = this.formatUptime(data.details.uptime);
            }
            if (memoryValue && data.details.memory) {
                memoryValue.textContent = this.formatMemory(data.details.memory.used);
            }
            if (nodeVersion && data.details.versions) {
                nodeVersion.textContent = data.details.versions.node;
            }
        }
    }

    updateSystemStatus(data) {
        // Update dependencies status
        const ytdlpStatus = document.getElementById('ytdlpStatus');
        const ffmpegStatus = document.getElementById('ffmpegStatus');
        const storageStatus = document.getElementById('storageStatus');

        if (ytdlpStatus) {
            ytdlpStatus.textContent = data.dependencies?.ytdlp ? '✓ Available' : '✗ Missing';
        }
        if (ffmpegStatus) {
            ffmpegStatus.textContent = data.dependencies?.ffmpeg ? '✓ Available' : '✗ Missing';
        }
        if (storageStatus) {
            storageStatus.textContent = '✓ Available';
        }

        // Update performance metrics
        const avgResponseTime = document.getElementById('avgResponseTime');
        const successfulConversions = document.getElementById('successfulConversions');
        const errorRate = document.getElementById('errorRate');

        if (avgResponseTime) {
            avgResponseTime.textContent = data.performance?.avgResponseTime ? 
                `${data.performance.avgResponseTime}ms` : '<50ms';
        }
        if (successfulConversions) {
            successfulConversions.textContent = data.stats?.conversions || '0';
        }
        if (errorRate) {
            errorRate.textContent = data.stats?.errorRate ? 
                `${(data.stats.errorRate * 100).toFixed(1)}%` : '0%';
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatMemory(bytes) {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    }
}

class TubeConvApp {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.currentSection = 'input';
        this.isConverting = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        
        // Initialize enhanced features
        initializeKeyboardShortcuts();
        
        // Show welcome message
        setTimeout(() => {
            showToast('Welcome to TubeConv! Paste a YouTube URL to get started.', 'info', 2000);
        }, 1000);
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
        this.previewSection = document.getElementById('previewSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        
        // Preview elements
        this.previewThumbnail = document.getElementById('previewThumbnail');
        this.previewTitle = document.getElementById('previewTitle');
        this.previewDuration = document.getElementById('previewDuration');
        this.previewChannel = document.getElementById('previewChannel');
        this.selectedQuality = document.getElementById('selectedQuality');
        this.confirmConversion = document.getElementById('confirmConversion');
        
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
        
        // Progress elements
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.etaTime = document.getElementById('etaTime');
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
        
        // Confirm conversion button
        this.confirmConversion.addEventListener('click', () => this.confirmAndConvert());
        
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
     * Validate YouTube URL with enhanced feedback
     */
    validateUrl() {
        const url = this.urlInput.value.trim();
        const validation = validateUrlEnhanced(url);
        
        this.convertBtn.disabled = !validation.valid || this.isConverting;
        
        if (validation.valid) {
            this.urlInput.classList.remove('error');
            this.urlInput.classList.add('success');
            this.convertBtn.classList.add('active');
            showToast(validation.message, 'success', 1000);
        } else if (url.length > 0) {
            this.urlInput.classList.add('error');
            this.urlInput.classList.remove('success');
            this.convertBtn.classList.remove('active');
        } else {
            this.urlInput.classList.remove('error', 'success');
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
        this.previewSection.classList.remove('visible');
        
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
            case 'preview':
                this.previewSection.classList.add('visible');
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
     * Handle convert button click - now shows preview first
     */
    async handleConvert() {
        if (this.isConverting) return;
        
        const url = this.urlInput.value.trim();
        if (!this.isValidYouTubeUrl(url)) {
            this.showError('Please enter a valid YouTube URL');
            return;
        }
        
        try {
            // Show preview first
            await this.showVideoPreview(url);
        } catch (error) {
            console.error('Preview failed:', error);
            this.showError(error.message || 'Failed to load video preview');
        }
    }

    /**
     * Show video preview before conversion
     */
    async showVideoPreview(url) {
        this.showSection('loading');
        this.updateLoadingStep(1);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch video information');
            }
            
            // Update preview UI
            this.previewThumbnail.src = data.thumbnailUrl;
            this.previewTitle.textContent = data.videoTitle;
            this.previewDuration.textContent = data.duration;
            this.previewChannel.textContent = data.channel;
            this.selectedQuality.textContent = `${this.getSelectedQuality()} kbps`;
            
            // Store URL for conversion
            this.pendingUrl = url;
            
            // Show preview section
            this.showSection('preview');
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Confirm and start conversion
     */
    async confirmAndConvert() {
        if (!this.pendingUrl) return;
        
        this.isConverting = true;
        
        try {
            await this.convertVideo(this.pendingUrl);
        } catch (error) {
            console.error('Conversion failed:', error);
            this.showError(error.message || 'Conversion failed');
        } finally {
            this.isConverting = false;
            this.pendingUrl = null;
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
     * Update progress bar and ETA
     */
    updateProgress(percentage, eta = null) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `${Math.round(percentage)}%`;
        }
        if (eta && this.etaTime) {
            this.etaTime.textContent = eta;
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
 * Enhanced Navigation and UI Manager
 */
class NavigationManager {
    constructor() {
        this.currentSection = 'converter';
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.page-section');
        this.navToggle = document.getElementById('navToggle');
        this.navMenu = document.querySelector('.nav-menu');
        
        this.init();
    }
    
    init() {
        // Handle navigation clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateToSection(section);
            });
        });
        
        // Handle mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const section = e.state?.section || 'converter';
            this.navigateToSection(section, false);
        });
        
        // Set initial state
        const hash = window.location.hash.replace('#', '');
        if (hash && ['converter', 'api', 'features', 'status'].includes(hash)) {
            this.navigateToSection(hash);
        }
    }
    
    navigateToSection(sectionName, pushState = true) {
        // Update URL
        if (pushState) {
            history.pushState({ section: sectionName }, '', `#${sectionName}`);
        }
        
        // Update navigation
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionName);
        });
        
        // Update sections
        this.sections.forEach(section => {
            const sectionId = `${sectionName}Section`;
            section.classList.toggle('active', section.id === sectionId);
        });
        
        this.currentSection = sectionName;
        
        // Close mobile menu
        this.navMenu.classList.remove('open');
        
        // Load section-specific data
        this.loadSectionData(sectionName);
        
        // Track navigation
        analytics.track('navigation', { section: sectionName });
    }
    
    toggleMobileMenu() {
        this.navMenu.classList.toggle('open');
    }
    
    loadSectionData(section) {
        switch (section) {
            case 'status':
                this.loadSystemStatus();
                break;
            case 'converter':
                this.loadConverterStats();
                break;
        }
    }
    
    async loadSystemStatus() {
        try {
            const response = await fetch('/api/health');
            const health = await response.json();
            
            this.updateHealthStatus(health);
        } catch (error) {
            console.error('Failed to load system status:', error);
            this.updateHealthStatus(null, error);
        }
    }
    
    updateHealthStatus(health, error = null) {
        const apiStatus = document.getElementById('apiStatus');
        const apiDetails = document.getElementById('apiDetails');
        const depsStatus = document.getElementById('depsStatus');
        
        if (error || !health) {
            // Error state
            this.updateStatusIndicator(apiStatus, 'error', 'Offline');
            this.updateStatusIndicator(depsStatus, 'error', 'Unknown');
            return;
        }
        
        // Update API status
        const statusClass = health.status === 'OK' ? 'active' : 
                          health.status === 'DEGRADED' ? 'degraded' : 'error';
        this.updateStatusIndicator(apiStatus, statusClass, health.status);
        
        // Update details
        if (health.uptime) {
            document.getElementById('uptimeValue').textContent = 
                this.formatUptime(health.uptime);
        }
        
        if (health.memory) {
            const memoryMB = Math.round(health.memory.heapUsed / 1024 / 1024);
            document.getElementById('memoryValue').textContent = `${memoryMB} MB`;
        }
        
        if (health.version) {
            document.getElementById('nodeVersion').textContent = health.version;
        }
        
        // Update dependencies
        if (health.dependencies) {
            const depsAllOk = Object.values(health.dependencies).every(status => status === 'OK');
            this.updateStatusIndicator(depsStatus, depsAllOk ? 'active' : 'degraded', 
                                     depsAllOk ? 'All OK' : 'Issues Detected');
            
            document.getElementById('ytdlpStatus').textContent = health.dependencies.ytdlp || '--';
            document.getElementById('ffmpegStatus').textContent = health.dependencies.ffmpeg || '--';
        }
        
        if (health.storage) {
            document.getElementById('storageStatus').textContent = 
                health.storage.downloadsExists ? 'Available' : 'Error';
        }
    }
    
    updateStatusIndicator(element, status, text) {
        const dot = element.querySelector('.status-dot');
        const textEl = element.querySelector('.status-text');
        
        if (dot) {
            dot.className = `status-dot ${status}`;
        }
        
        if (textEl) {
            textEl.textContent = text;
        }
    }
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    async loadConverterStats() {
        // Update hero stats
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            document.getElementById('statUptime').textContent = 'Online';
            
            // You could extend this to show actual conversion stats
            // if you implement a stats endpoint
        } catch (error) {
            document.getElementById('statUptime').textContent = 'Offline';
        }
    }
}

// Quick Actions Handler
class QuickActionsHandler {
    constructor(app) {
        this.app = app;
        this.init();
    }
    
    init() {
        const pasteBtn = document.getElementById('pasteBtn');
        const clearBtn = document.getElementById('clearBtn');
        const refreshStatusBtn = document.getElementById('refreshStatus');
        
        if (pasteBtn) {
            pasteBtn.addEventListener('click', () => this.handlePaste());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClear());
        }
        
        if (refreshStatusBtn) {
            refreshStatusBtn.addEventListener('click', () => this.handleRefreshStatus());
        }
    }
    
    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
                this.app.urlInput.value = text.trim();
                this.app.urlInput.dispatchEvent(new Event('input'));
                showToast('YouTube URL pasted successfully!', 'success');
                analytics.track('quick_action', { action: 'paste' });
            } else {
                showToast('No YouTube URL found in clipboard', 'error');
            }
        } catch (error) {
            showToast('Failed to access clipboard', 'error');
        }
    }
    
    handleClear() {
        this.app.urlInput.value = '';
        this.app.urlInput.dispatchEvent(new Event('input'));
        this.app.urlInput.focus();
        showToast('Input cleared', 'info');
        analytics.track('quick_action', { action: 'clear' });
    }
    
    handleRefreshStatus() {
        if (window.navigationManager) {
            window.navigationManager.loadSystemStatus();
            showToast('Status refreshed', 'success');
            analytics.track('quick_action', { action: 'refresh_status' });
        }
    }
}

// Performance metrics tracker
class PerformanceTracker {
    constructor() {
        this.metrics = {
            conversionTimes: [],
            errorRate: 0,
            successfulConversions: 0,
            totalAttempts: 0
        };
        
        this.updateDisplay();
        this.startPeriodicUpdates();
    }
    
    recordConversion(success, duration = null) {
        this.metrics.totalAttempts++;
        
        if (success) {
            this.metrics.successfulConversions++;
            if (duration) {
                this.metrics.conversionTimes.push(duration);
                // Keep only last 10 conversions
                if (this.metrics.conversionTimes.length > 10) {
                    this.metrics.conversionTimes.shift();
                }
            }
        }
        
        this.metrics.errorRate = 
            ((this.metrics.totalAttempts - this.metrics.successfulConversions) / 
             this.metrics.totalAttempts * 100).toFixed(1);
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        const avgResponseTime = document.getElementById('avgResponseTime');
        const successfulConversions = document.getElementById('successfulConversions');
        const errorRate = document.getElementById('errorRate');
        
        if (avgResponseTime && this.metrics.conversionTimes.length > 0) {
            const avg = this.metrics.conversionTimes.reduce((a, b) => a + b, 0) / 
                       this.metrics.conversionTimes.length;
            avgResponseTime.textContent = `${(avg / 1000).toFixed(1)}s`;
        }
        
        if (successfulConversions) {
            successfulConversions.textContent = this.metrics.successfulConversions.toString();
        }
        
        if (errorRate) {
            errorRate.textContent = `${this.metrics.errorRate}%`;
        }
    }
    
    startPeriodicUpdates() {
        // Update performance display every 30 seconds
        setInterval(() => {
            this.updateDisplay();
        }, 30000);
    }
}

/**
 * Enhanced UI/UX Features
 */

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Enhanced URL validation with better feedback
function validateUrlEnhanced(url) {
    if (!url) return { valid: false, message: 'Please enter a URL' };
    
    const patterns = {
        youtube: /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/,
        youtubeShorts: /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
        youtubeLive: /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+.*[&?]t=\d+/
    };
    
    if (patterns.youtube.test(url) || patterns.youtubeShorts.test(url)) {
        return { valid: true, message: 'Valid YouTube URL' };
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return { valid: false, message: 'Invalid YouTube URL format' };
    }
    
    return { valid: false, message: 'Please enter a YouTube URL' };
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to convert
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const convertBtn = document.getElementById('convertBtn');
            if (!convertBtn.disabled) {
                convertBtn.click();
            }
        }
        
        // Escape to close settings
        if (e.key === 'Escape') {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel.classList.contains('open')) {
                settingsPanel.classList.remove('open');
            }
        }
    });
}

// Enhanced error handling with retry logic
class ErrorHandler {
    static handle(error, context = '') {
        console.error(`[${context}]`, error);
        
        let userMessage = 'An unexpected error occurred';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Connection failed. Please check your internet connection.';
        } else if (error.message.includes('rate limit')) {
            userMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('Invalid YouTube URL')) {
            userMessage = 'Please enter a valid YouTube URL';
        } else if (error.message) {
            userMessage = error.message;
        }
        
        showToast(userMessage, 'error');
        return userMessage;
    }
}

// Performance monitoring
class PerformanceMonitor {
    static timers = {};
    
    static start(label) {
        this.timers[label] = performance.now();
    }
    
    static end(label) {
        if (this.timers[label]) {
            const duration = performance.now() - this.timers[label];
            console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
            delete this.timers[label];
            return duration;
        }
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
    
    // Service worker registration (for PWA features)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('New version available! Refresh to update.', 'info', 5000);
                        }
                    });
                });
            } catch (error) {
                console.log('❌ Service Worker registration failed:', error);
            }
        });
    }
    
    // Install prompt handling
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install banner after user interaction
        setTimeout(() => {
            showInstallPrompt();
        }, 30000); // Show after 30 seconds
    });
    
    // Show install prompt
    function showInstallPrompt() {
        if (deferredPrompt && !localStorage.getItem('installPromptDismissed')) {
            const installBanner = document.createElement('div');
            installBanner.className = 'install-banner';
            installBanner.innerHTML = `
                <div class="install-content">
                    <div class="install-icon">📱</div>
                    <div class="install-text">
                        <strong>Install TubeConv</strong>
                        <p>Add to your home screen for quick access</p>
                    </div>
                    <div class="install-actions">
                        <button id="installBtn" class="install-btn">Install</button>
                        <button id="dismissBtn" class="dismiss-btn">×</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(installBanner);
            
            // Handle install click
            document.getElementById('installBtn').addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const result = await deferredPrompt.userChoice;
                    if (result.outcome === 'accepted') {
                        console.log('✅ User accepted PWA install');
                    }
                    deferredPrompt = null;
                    installBanner.remove();
                }
            });
            
            // Handle dismiss click
            document.getElementById('dismissBtn').addEventListener('click', () => {
                localStorage.setItem('installPromptDismissed', 'true');
                installBanner.remove();
            });
        }
    }
    
    // Handle URL parameters for shortcuts
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'convert') {
        app.urlInput.focus();
        showToast('Ready to convert! Paste your YouTube URL.', 'info', 3000);
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

/**
 * Initialize Navigation and Quick Actions
 */
let navigationManager;

// Initialize navigation manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    navigationManager = new NavigationManager();
    
    // Initialize quick actions
    initializeQuickActions();
    
    // Initialize status refresh button
    const refreshStatusBtn = document.getElementById('refreshStatus');
    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', () => {
            if (navigationManager) {
                navigationManager.loadStatusData();
                showToast('Status refreshed', 'success');
            }
        });
    }
    
    // Handle hash changes for navigation
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (['input', 'api', 'features', 'status'].includes(hash)) {
            navigationManager.showSection(hash);
        }
    });
    
    // Load initial section from hash
    const initialHash = window.location.hash.substring(1);
    if (['input', 'api', 'features', 'status'].includes(initialHash)) {
        navigationManager.showSection(initialHash);
    }
    
    // Update hero stats periodically
    updateHeroStats();
    setInterval(updateHeroStats, 30000); // Update every 30 seconds
});

/**
 * Initialize Quick Actions
 */
function initializeQuickActions() {
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(action => {
        action.addEventListener('click', () => {
            const actionType = action.dataset.action;
            handleQuickAction(actionType);
        });
    });
}

/**
 * Handle Quick Actions
 */
function handleQuickAction(action) {
    switch (action) {
        case 'paste':
            navigator.clipboard.readText().then(text => {
                const urlInput = document.getElementById('urlInput');
                if (urlInput && (text.includes('youtube.com') || text.includes('youtu.be'))) {
                    urlInput.value = text.trim();
                    urlInput.dispatchEvent(new Event('input'));
                    navigationManager.showSection('input');
                    showToast('URL pasted and ready to convert!', 'success');
                } else {
                    showToast('No YouTube URL found in clipboard', 'warning');
                }
            }).catch(() => {
                showToast('Failed to access clipboard', 'error');
            });
            break;
            
        case 'clear':
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                urlInput.value = '';
                urlInput.dispatchEvent(new Event('input'));
                showToast('Input cleared', 'info');
            }
            break;
            
        case 'settings':
            app.toggleSettings();
            break;
            
        case 'api-docs':
            window.open('/api-docs', '_blank');
            break;
    }
}

/**
 * Update Hero Stats
 */
async function updateHeroStats() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        // Update conversions count
        const conversionsEl = document.getElementById('statConversions');
        if (conversionsEl && data.stats?.conversions) {
            conversionsEl.textContent = data.stats.conversions.toLocaleString();
        }
        
        // Update uptime status
        const uptimeEl = document.getElementById('statUptime');
        if (uptimeEl) {
            uptimeEl.textContent = 'Online';
            uptimeEl.className = 'stat-number online';
        }
        
    } catch (error) {
        console.warn('Failed to update hero stats:', error);
        const uptimeEl = document.getElementById('statUptime');
        if (uptimeEl) {
            uptimeEl.textContent = 'Offline';
            uptimeEl.className = 'stat-number offline';
        }
    }
}

/**
 * Enhanced Error Handling for Navigation
 */
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
    // Don't show toast for minor errors to avoid spam
});

/**
 * Performance Monitoring for Navigation
 */
const performanceTracker = new PerformanceTracker();

// Track navigation performance
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
        const section = e.target.dataset.section;
        performanceTracker.start(`navigation-${section}`);
        
        // Track completion when section is shown
        setTimeout(() => {
            performanceTracker.end(`navigation-${section}`);
        }, 100);
    }
});

/**
 * Accessibility Enhancements
 */
document.addEventListener('keydown', (e) => {
    // Tab navigation for sections
    if (e.key === 'Tab' && e.altKey) {
        e.preventDefault();
        const sections = ['input', 'api', 'features', 'status'];
        const currentIndex = sections.indexOf(navigationManager.currentSection);
        const nextIndex = (currentIndex + 1) % sections.length;
        navigationManager.showSection(sections[nextIndex]);
        showToast(`Switched to ${sections[nextIndex]} section`, 'info', 1000);
    }
});
