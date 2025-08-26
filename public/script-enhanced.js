/**
 * Enhanced TubeConv Features
 * Batch conversion, playlist support, and format selection
 */

// Add these methods to the TubeConvApp class

// Batch Conversion Methods
TubeConvApp.prototype.showBatchConversion = function() {
    if (this.batchSection) {
        this.showSectionEnhanced('batch');
        if (this.batchUrls) {
            this.batchUrls.focus();
        }
    }
};

TubeConvApp.prototype.startBatchConversion = async function() {
    const urls = this.batchUrls.value.trim().split('\n').filter(url => url.trim());
    
    if (urls.length === 0) {
        this.showToast('Please enter at least one URL', 'error');
        return;
    }
    
    if (urls.length > 10) {
        this.showToast('Maximum 10 URLs allowed per batch', 'error');
        return;
    }
    
    const audioQuality = this.getSelectedQuality();
    const format = this.getSelectedFormat();
    
    try {
        // Show batch progress
        if (this.batchProgress) {
            this.batchProgress.style.display = 'block';
        }
        
        let successCount = 0;
        let failCount = 0;
        const results = [];
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i].trim();
            
            // Update progress
            this.updateBatchProgress(i, successCount, failCount, urls.length);
            
            try {
                const endpoint = format === 'mp3' ? '/api/convert' : '/api/convert-format';
                const requestBody = format === 'mp3' 
                    ? { url, audioQuality }
                    : { url, format, audioQuality };
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    results.push(data);
                    successCount++;
                } else {
                    const error = await response.json();
                    results.push({ error: error.message || 'Conversion failed', url });
                    failCount++;
                }
            } catch (error) {
                console.error(`Error converting ${url}:`, error);
                results.push({ error: error.message, url });
                failCount++;
            }
        }
        
        // Update final progress
        this.updateBatchProgress(urls.length, successCount, failCount, urls.length);
        
        // Show results
        this.displayBatchResults(results, successCount, failCount);
        
    } catch (error) {
        console.error('Batch conversion error:', error);
        this.showError('Batch conversion failed: ' + error.message);
    }
};

TubeConvApp.prototype.updateBatchProgress = function(current, success, failed, total) {
    const percentage = (current / total) * 100;
    
    if (this.batchProgressText) {
        this.batchProgressText.textContent = `${current}/${total}`;
    }
    
    if (this.batchSuccessCount) {
        this.batchSuccessCount.textContent = success.toString();
    }
    
    if (this.batchFailCount) {
        this.batchFailCount.textContent = failed.toString();
    }
    
    if (this.batchProgressBarFill) {
        this.batchProgressBarFill.style.width = `${percentage}%`;
    }
};

TubeConvApp.prototype.displayBatchResults = function(results, successCount, failCount) {
    // Update summary stats
    if (this.totalSuccess) this.totalSuccess.textContent = successCount;
    if (this.totalFailed) this.totalFailed.textContent = failCount;
    if (this.totalProcessed) this.totalProcessed.textContent = results.length;
    
    // Create download links
    if (this.batchDownloads) {
        this.batchDownloads.innerHTML = '';
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = `batch-result-item ${result.error ? 'failed' : 'success'}`;
            
            if (result.error) {
                resultItem.innerHTML = `
                    <div class="result-status error">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        Failed
                    </div>
                    <div class="result-details">
                        <div class="result-title">${result.url}</div>
                        <div class="result-error">${result.error}</div>
                    </div>
                `;
            } else {
                resultItem.innerHTML = `
                    <div class="result-status success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Success
                    </div>
                    <div class="result-details">
                        <div class="result-title">${result.videoTitle}</div>
                        <div class="result-meta">${result.duration} • ${result.audioQuality || result.format} • ${result.processingTime}</div>
                    </div>
                    <a href="${result.downloadUrl}" class="download-link" target="_blank">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12L15 7H12V3H8V7H5L10 12Z"/>
                            <path d="M3 15H17V17H3V15Z"/>
                        </svg>
                        Download
                    </a>
                `;
            }
            
            this.batchDownloads.appendChild(resultItem);
        });
    }
    
    // Show batch results section
    this.showSectionEnhanced('batch-results');
    this.showToast(`Batch conversion completed! ${successCount} successful, ${failCount} failed`, 'info');
};

TubeConvApp.prototype.downloadAllFiles = function() {
    const downloadLinks = this.batchDownloads.querySelectorAll('.download-link');
    
    if (downloadLinks.length === 0) {
        this.showToast('No files available for download', 'warning');
        return;
    }
    
    downloadLinks.forEach((link, index) => {
        setTimeout(() => {
            window.open(link.href, '_blank');
        }, index * 500); // Stagger downloads by 500ms
    });
    
    this.showToast(`Started downloading ${downloadLinks.length} files`, 'success');
};

// Playlist Support Methods
TubeConvApp.prototype.handlePlaylist = async function() {
    const url = this.urlInput.value.trim();
    
    if (!url) {
        this.showToast('Please enter a playlist URL first', 'error');
        return;
    }
    
    try {
        this.showSectionEnhanced('playlist');
        
        // Fetch playlist information
        const response = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.displayPlaylistInfo(data);
        
    } catch (error) {
        console.error('Playlist fetch error:', error);
        this.showError('Failed to fetch playlist information: ' + error.message);
    }
};

TubeConvApp.prototype.displayPlaylistInfo = function(data) {
    if (this.playlistName) {
        this.playlistName.textContent = data.playlistTitle || 'Unknown Playlist';
    }
    
    if (this.playlistVideoCount) {
        this.playlistVideoCount.textContent = `${data.totalVideos} videos`;
    }
    
    if (this.playlistPreview && data.previewVideos) {
        this.playlistPreview.innerHTML = '';
        
        data.previewVideos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'playlist-video-item';
            videoItem.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}" class="playlist-thumbnail">
                <div class="playlist-video-info">
                    <div class="playlist-video-title">${video.title}</div>
                    <div class="playlist-video-duration">${video.duration}</div>
                </div>
            `;
            this.playlistPreview.appendChild(videoItem);
        });
    }
    
    // Store playlist URLs for conversion
    this.currentPlaylistUrls = data.videoUrls;
};

TubeConvApp.prototype.convertPlaylist = async function() {
    if (!this.currentPlaylistUrls || this.currentPlaylistUrls.length === 0) {
        this.showToast('No playlist URLs available', 'error');
        return;
    }
    
    // Use batch conversion for playlist
    if (this.batchUrls) {
        this.batchUrls.value = this.currentPlaylistUrls.join('\n');
    }
    
    this.showSectionEnhanced('batch');
    await this.startBatchConversion();
};

// Format Selection Methods
TubeConvApp.prototype.getSelectedFormat = function() {
    const selected = document.querySelector('input[name="outputFormat"]:checked');
    return selected ? selected.value : 'mp3';
};

// Enhanced Section Display
TubeConvApp.prototype.showSectionEnhanced = function(sectionName) {
    const allSections = [
        this.inputSection, 
        this.previewSection, 
        this.loadingSection, 
        this.resultSection,
        this.batchSection,
        this.playlistSection,
        this.batchResultsSection,
        this.errorSection
    ];
    
    // Hide all sections
    allSections.forEach(section => {
        if (section) {
            section.classList.remove('visible');
            section.style.display = 'none';
        }
    });
    
    // Show target section
    let targetSection;
    switch (sectionName) {
        case 'input':
            targetSection = this.inputSection;
            break;
        case 'loading':
            targetSection = this.loadingSection;
            break;
        case 'result':
            targetSection = this.resultSection;
            break;
        case 'batch':
            targetSection = this.batchSection;
            break;
        case 'playlist':
            targetSection = this.playlistSection;
            break;
        case 'batch-results':
            targetSection = this.batchResultsSection;
            break;
        case 'error':
            targetSection = this.errorSection;
            break;
    }
    
    if (targetSection) {
        targetSection.style.display = 'flex';
        setTimeout(() => targetSection.classList.add('visible'), 10);
    }
};

// Enhanced URL validation for batch mode
TubeConvApp.prototype.validateUrl = function() {
    const url = this.urlInput.value.trim();
    const isValid = this.isValidVideoUrl(url);
    
    // Enable/disable buttons based on URL validity
    [this.convertBtn, this.batchBtn, this.playlistBtn].forEach(btn => {
        if (btn) btn.disabled = !isValid;
    });
    
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
};

// Enhanced settings save/load
TubeConvApp.prototype.saveSettings = function() {
    const selectedQuality = this.getSelectedQuality();
    const selectedFormat = this.getSelectedFormat();
    
    localStorage.setItem('audioQuality', selectedQuality);
    localStorage.setItem('outputFormat', selectedFormat);
};

TubeConvApp.prototype.loadSettings = function() {
    const savedQuality = localStorage.getItem('audioQuality') || '320';
    const savedFormat = localStorage.getItem('outputFormat') || 'mp3';
    
    const qualityRadio = document.querySelector(`input[name="audioQuality"][value="${savedQuality}"]`);
    const formatRadio = document.querySelector(`input[name="outputFormat"][value="${savedFormat}"]`);
    
    if (qualityRadio) {
        qualityRadio.checked = true;
    }
    
    if (formatRadio) {
        formatRadio.checked = true;
    }
};

// Enhanced conversion with format support
TubeConvApp.prototype.startConversion = async function() {
    if (this.isConverting) return;
    
    this.isConverting = true;
    const url = this.urlInput.value.trim();
    const audioQuality = this.getSelectedQuality();
    const format = this.getSelectedFormat();
    
    try {
        this.showSectionEnhanced('loading');
        this.resetLoadingSteps();
        this.updateLoadingStep(1, 'active');
        this.updateProgress(0, 'Starting conversion...');
        
        const endpoint = format === 'mp3' ? '/api/convert' : '/api/convert-format';
        const requestBody = format === 'mp3' 
            ? { url, audioQuality, metadata: { title: '', artist: '' } }
            : { url, format, audioQuality, metadata: { title: '', artist: '' } };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
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
            this.showSectionEnhanced('result');
            this.isConverting = false;
            
            // Show success message
            this.showToast(`${format.toUpperCase()} conversion completed successfully!`, 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Conversion failed:', error);
        this.isConverting = false;
        this.showError(error.message || 'Conversion failed. Please try again.');
    }
};

// Update display result for different formats
TubeConvApp.prototype.displayResult = function(data) {
    if (this.videoThumbnail) this.videoThumbnail.src = data.thumbnailUrl;
    if (this.videoTitle) this.videoTitle.textContent = data.videoTitle;
    if (this.videoDuration) this.videoDuration.textContent = this.formatDuration(data.duration);
    
    // Display quality/format info
    let qualityText = '';
    if (data.format === 'mp4') {
        qualityText = `${data.videoQuality}p MP4`;
    } else {
        qualityText = `${data.audioQuality} kbps ${data.format.toUpperCase()}`;
    }
    
    if (this.audioQualityDisplay) {
        this.audioQualityDisplay.textContent = qualityText;
    }
    
    // Update download button text
    if (this.downloadBtn) {
        this.downloadBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12L15 7H12V3H8V7H5L10 12Z"/>
                <path d="M3 15H17V17H3V15Z"/>
            </svg>
            Download ${(data.format || 'MP3').toUpperCase()}
        `;
    }
    
    // Store the download URL for the download button
    this.currentDownloadUrl = data.downloadUrl;
};
