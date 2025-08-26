const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Compression middleware
app.use(compression());

// Enhanced logging
app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
}));

// Performance monitoring middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
    });
    
    next();
});

// Enhanced rate limiting with different limits for different endpoints
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { success: false, error: message },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many requests from this IP, please try again later.'
);

const conversionLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 conversions per window
    'Too many conversion requests, please try again later.'
);

const previewLimiter = createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    20, // 20 previews per window
    'Too many preview requests, please try again later.'
);

// Apply rate limiting
app.use('/', generalLimiter);
app.use('/api/convert', conversionLimiter);
app.use('/api/preview', previewLimiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Serve downloads directory
app.use('/downloads', express.static('downloads'));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "TubeConv API Documentation"
}));

// Ensure required directories exist
const initDirectories = async () => {
    const dirs = ['temp', 'downloads'];
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
};

// Enhanced URL validation with security checks
const isValidVideoUrl = (url) => {
    try {
        const urlObj = new URL(url);
        
        // Security: Block dangerous protocols
        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(urlObj.protocol)) {
            return false;
        }
        
        // Security: Block local/internal addresses
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname === 'localhost' || 
            hostname.startsWith('127.') || 
            hostname.startsWith('10.') || 
            hostname.startsWith('192.168.') || 
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
            return false;
        }
        
        // Supported video platforms
        const supportedDomains = [
            'youtube.com', 'youtu.be', 'm.youtube.com',
            'tiktok.com', 'vm.tiktok.com',
            'instagram.com', 'instagr.am',
            'vimeo.com', 'player.vimeo.com',
            'twitch.tv', 'clips.twitch.tv',
            'facebook.com', 'fb.watch',
            'twitter.com', 'x.com',
            'dailymotion.com', 'dai.ly',
            'soundcloud.com', 'reddit.com'
        ];
        
        const baseDomain = hostname.replace(/^www\./, '');
        const isSupported = supportedDomains.some(domain => 
            baseDomain === domain || baseDomain.endsWith('.' + domain)
        );
        
        return isSupported;
    } catch (error) {
        return false;
    }
};

// Legacy YouTube-only validation (for backward compatibility)
const isValidYouTubeUrl = (url) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
    return regex.test(url) && isValidVideoUrl(url);
};

// Execute command with promise
const executeCommand = (command, args, options = {}) => {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, { 
            stdio: ['ignore', 'pipe', 'pipe'],
            ...options 
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });
        
        process.on('error', (error) => {
            reject(error);
        });
    });
};

// Get video info using yt-dlp
const getVideoInfo = async (url) => {
    try {
        const titleOutput = await executeCommand('yt-dlp', ['--get-title', url]);
        const thumbnailOutput = await executeCommand('yt-dlp', ['--get-thumbnail', url]);
        const durationOutput = await executeCommand('yt-dlp', ['--get-duration', url]);
        
        return {
            title: titleOutput,
            thumbnail: thumbnailOutput,
            duration: durationOutput
        };
    } catch (error) {
        throw new Error('Failed to fetch video information');
    }
};

// Download audio using yt-dlp
const downloadAudio = async (url, outputPath) => {
    try {
        await executeCommand('yt-dlp', [
            '-f', 'bestaudio',
            '-o', outputPath,
            url
        ]);
        
        // Find the actual downloaded file (yt-dlp might add extension)
        const dir = path.dirname(outputPath);
        const basename = path.basename(outputPath, path.extname(outputPath));
        const files = await fs.readdir(dir);
        const downloadedFile = files.find(file => file.startsWith(basename));
        
        if (!downloadedFile) {
            throw new Error('Downloaded file not found');
        }
        
        return path.join(dir, downloadedFile);
    } catch (error) {
        throw new Error('Failed to download audio');
    }
};

// Convert to MP3 using ffmpeg
const convertToMp3 = async (inputPath, outputPath, quality = '320', metadata = {}) => {
    const args = [
        '-i', inputPath,
        '-acodec', 'libmp3lame',
        '-b:a', `${quality}k`,
        '-y' // Overwrite output file
    ];
    
    // Add metadata if provided
    if (metadata.title) {
        args.push('-metadata', `title=${metadata.title}`);
    }
    if (metadata.artist) {
        args.push('-metadata', `artist=${metadata.artist}`);
    }
    
    args.push(outputPath);
    
    try {
        await executeCommand('ffmpeg', args);
    } catch (error) {
        throw new Error('Failed to convert to MP3');
    }
};

// Enhanced validation and error handling
const validateConversionRequest = (req, res, next) => {
    const { url, audioQuality = '320', metadata = {} } = req.body;
    
    // Validate URL
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'YouTube URL is required',
            code: 'MISSING_URL'
        });
    }
    
    if (!isValidYouTubeUrl(url)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid YouTube URL provided',
            code: 'INVALID_URL'
        });
    }
    
    // Validate audio quality
    const validQualities = ['128', '192', '256', '320'];
    if (!validQualities.includes(audioQuality)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid audio quality. Must be one of: ' + validQualities.join(', '),
            code: 'INVALID_QUALITY'
        });
    }
    
    // Validate metadata
    if (metadata.title && metadata.title.length > 100) {
        return res.status(400).json({
            success: false,
            error: 'Title must be less than 100 characters',
            code: 'TITLE_TOO_LONG'
        });
    }
    
    if (metadata.artist && metadata.artist.length > 100) {
        return res.status(400).json({
            success: false,
            error: 'Artist name must be less than 100 characters',
            code: 'ARTIST_TOO_LONG'
        });
    }
    
    next();
};

// Enhanced file cleanup with better logging
const enhancedCleanupFiles = async (files) => {
    const results = [];
    for (const file of files) {
        try {
            await fs.unlink(file);
            results.push({ file, status: 'deleted' });
            console.log(`✓ Cleaned up: ${file}`);
        } catch (error) {
            results.push({ file, status: 'error', error: error.message });
            console.error(`✗ Failed to delete ${file}:`, error.message);
        }
    }
    return results;
};

// System health check
const getSystemHealth = async () => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        dependencies: {}
    };
    
    // Check yt-dlp
    try {
        await executeCommand('yt-dlp', ['--version']);
        health.dependencies.ytdlp = 'OK';
    } catch (error) {
        health.dependencies.ytdlp = 'ERROR';
        health.status = 'DEGRADED';
    }
    
    // Check ffmpeg
    try {
        await executeCommand('ffmpeg', ['-version']);
        health.dependencies.ffmpeg = 'OK';
    } catch (error) {
        health.dependencies.ffmpeg = 'ERROR';
        health.status = 'DEGRADED';
    }
    
    // Check disk space
    try {
        const stats = await fs.stat('./downloads');
        health.storage = {
            downloadsExists: true,
            lastModified: stats.mtime
        };
    } catch (error) {
        health.storage = { downloadsExists: false };
    }
    
    return health;
};

// Enhanced conversion with progress tracking
const convertToMp3Enhanced = async (inputPath, outputPath, audioQuality, metadata, progressCallback) => {
    const args = [
        '-i', inputPath,
        '-acodec', 'libmp3lame',
        '-ab', `${audioQuality}k`,
        '-ar', '44100',
        '-y'
    ];
    
    // Add metadata if provided
    if (metadata.title) {
        args.push('-metadata', `title=${metadata.title}`);
    }
    if (metadata.artist) {
        args.push('-metadata', `artist=${metadata.artist}`);
    }
    
    args.push(outputPath);
    
    try {
        // Use spawn for better progress tracking
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args);
            
            let errorOutput = '';
            
            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();
                errorOutput += output;
                
                // Parse progress if callback provided
                if (progressCallback) {
                    const progressMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
                    if (progressMatch) {
                        const [, hours, minutes, seconds] = progressMatch;
                        const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
                        progressCallback(totalSeconds);
                    }
                }
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg conversion failed with code ${code}: ${errorOutput}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                reject(error);
            });
        });
    } catch (error) {
        throw new Error('Failed to convert to MP3: ' + error.message);
    }
};

// Clean up temporary files
const cleanupFiles = async (files) => {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch (error) {
            console.error(`Failed to delete ${file}:`, error.message);
        }
    }
};

// Request caching middleware
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

const cacheMiddleware = (duration) => (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
    }
    
    res.sendResponse = res.json;
    res.json = (data) => {
        cache.set(key, data, duration);
        res.set('X-Cache', 'MISS');
        res.sendResponse(data);
    };
    
    next();
};

// Enhanced API endpoints

// Comprehensive health check endpoint
app.get('/api/health', cacheMiddleware(60), async (req, res) => {
    try {
        const health = await getSystemHealth();
        res.status(health.status === 'OK' ? 200 : 503).json(health);
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        service: 'TubeConv API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
            preview: '/api/preview',
            convert: '/api/convert',
            health: '/api/health',
            docs: '/api-docs'
        }
    });
});

// Enhanced preview endpoint with caching headers
app.post('/api/preview', previewLimiter, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { url } = req.body;
        
        // Validate input
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'YouTube URL is required',
                code: 'MISSING_URL'
            });
        }
        
        if (!isValidYouTubeUrl(url)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid YouTube URL provided',
                code: 'INVALID_URL'
            });
        }
        
        console.log(`🔍 Fetching preview for: ${url}`);
        const videoInfo = await getVideoInfo(url);
        
        // Get additional metadata with error handling
        const channelOutput = await executeCommand('yt-dlp', ['--get-filename', '-o', '%(uploader)s', url])
            .catch(() => 'Unknown Channel');
        const viewCountOutput = await executeCommand('yt-dlp', ['--get-filename', '-o', '%(view_count)s', url])
            .catch(() => '0');
        const uploadDateOutput = await executeCommand('yt-dlp', ['--get-filename', '-o', '%(upload_date)s', url])
            .catch(() => '');
        
        const processingTime = Date.now() - startTime;
        
        // Set caching headers
        res.set({
            'Cache-Control': 'public, max-age=300', // 5 minutes
            'ETag': `"${Buffer.from(url).toString('base64')}"`
        });
        
        res.json({
            success: true,
            videoTitle: videoInfo.title,
            thumbnailUrl: videoInfo.thumbnail,
            duration: videoInfo.duration,
            channel: channelOutput,
            viewCount: parseInt(viewCountOutput) || 0,
            uploadDate: uploadDateOutput,
            processingTime: `${processingTime}ms`
        });
        
    } catch (error) {
        console.error('❌ Preview error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch video information',
            code: 'PREVIEW_ERROR'
        });
    }
});

// Enhanced conversion endpoint with better progress tracking
app.post('/api/convert', conversionLimiter, validateConversionRequest, async (req, res) => {
    const startTime = Date.now();
    let tempFiles = [];
    const requestId = uuidv4();
    
    try {
        const { url, audioQuality = '320', metadata = {} } = req.body;
        
        console.log(`🎵 [${requestId}] Starting conversion: ${url} (${audioQuality}kbps)`);
        
        // Get video info
        const videoInfo = await getVideoInfo(url);
        console.log(`📹 [${requestId}] Video info: ${videoInfo.title}`);
        
        // Generate unique filename
        const uniqueId = uuidv4();
        const tempAudioPath = `temp/${uniqueId}_temp`;
        const outputMp3Path = `downloads/${uniqueId}.mp3`;
        
        // Download audio
        console.log(`⬇️  [${requestId}] Downloading audio...`);
        const downloadedAudioPath = await downloadAudio(url, tempAudioPath);
        tempFiles.push(downloadedAudioPath);
        
        // Convert to MP3 with progress tracking
        console.log(`🔄 [${requestId}] Converting to MP3...`);
        await convertToMp3Enhanced(downloadedAudioPath, outputMp3Path, audioQuality, metadata);
        
        // Clean up temporary files
        await enhancedCleanupFiles(tempFiles);
        
        // Prepare response
        const downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${uniqueId}.mp3`;
        const processingTime = Date.now() - startTime;
        
        // Schedule file cleanup (delete after 1 hour)
        setTimeout(async () => {
            try {
                await fs.unlink(outputMp3Path);
                console.log(`🧹 [${requestId}] Auto-cleaned: ${outputMp3Path}`);
            } catch (error) {
                console.error(`❌ [${requestId}] Failed to auto-cleanup ${outputMp3Path}:`, error.message);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        console.log(`✅ [${requestId}] Conversion completed in ${processingTime}ms`);
        
        res.json({
            success: true,
            requestId,
            videoTitle: videoInfo.title,
            thumbnailUrl: videoInfo.thumbnail,
            duration: videoInfo.duration,
            downloadUrl: downloadUrl,
            audioQuality: audioQuality,
            processingTime: `${processingTime}ms`
        });
        
    } catch (error) {
        console.error(`❌ [${requestId}] Conversion error:`, error);
        
        // Clean up any temporary files on error
        await enhancedCleanupFiles(tempFiles);
        
        res.status(500).json({
            success: false,
            requestId,
            error: error.message || 'An error occurred during conversion',
            code: 'CONVERSION_ERROR'
        });
    }
});

// New Feature: Batch Conversion endpoint
app.post('/api/batch-convert', conversionLimiter, async (req, res) => {
    const startTime = Date.now();
    const batchId = uuidv4();
    const { urls, audioQuality = '320', metadata = {} } = req.body;
    
    try {
        // Validate input
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'URLs array is required and must not be empty',
                code: 'MISSING_URLS'
            });
        }
        
        if (urls.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 10 URLs allowed per batch',
                code: 'TOO_MANY_URLS'
            });
        }
        
        console.log(`📦 [${batchId}] Starting batch conversion: ${urls.length} URLs`);
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i].trim();
            try {
                if (!isValidYouTubeUrl(url)) {
                    errors.push({ url, error: 'Invalid URL' });
                    continue;
                }
                
                console.log(`🎵 [${batchId}] Processing ${i + 1}/${urls.length}: ${url}`);
                
                // Get video info
                const videoInfo = await getVideoInfo(url);
                
                // Generate unique filename
                const uniqueId = uuidv4();
                const tempAudioPath = `temp/${uniqueId}_temp`;
                const outputMp3Path = `downloads/${uniqueId}.mp3`;
                
                // Download and convert
                const downloadedAudioPath = await downloadAudio(url, tempAudioPath);
                await convertToMp3Enhanced(downloadedAudioPath, outputMp3Path, audioQuality, metadata);
                
                // Clean up temp file
                await fs.unlink(downloadedAudioPath).catch(() => {});
                
                const downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${uniqueId}.mp3`;
                
                results.push({
                    url,
                    videoTitle: videoInfo.title,
                    thumbnailUrl: videoInfo.thumbnail,
                    duration: videoInfo.duration,
                    downloadUrl,
                    audioQuality
                });
                
                // Schedule cleanup
                setTimeout(async () => {
                    try {
                        await fs.unlink(outputMp3Path);
                        console.log(`🧹 [${batchId}] Auto-cleaned: ${outputMp3Path}`);
                    } catch (error) {
                        console.error(`❌ Failed to auto-cleanup ${outputMp3Path}:`, error.message);
                    }
                }, 60 * 60 * 1000); // 1 hour
                
            } catch (error) {
                console.error(`❌ [${batchId}] Error processing ${url}:`, error.message);
                errors.push({ url, error: error.message });
            }
        }
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ [${batchId}] Batch conversion completed in ${processingTime}ms`);
        
        res.json({
            success: true,
            batchId,
            results,
            errors,
            summary: {
                total: urls.length,
                successful: results.length,
                failed: errors.length
            },
            processingTime: `${processingTime}ms`
        });
        
    } catch (error) {
        console.error(`❌ [${batchId}] Batch conversion error:`, error);
        res.status(500).json({
            success: false,
            batchId,
            error: error.message || 'Batch conversion failed',
            code: 'BATCH_CONVERSION_ERROR'
        });
    }
});

// New Feature: Playlist information endpoint
app.post('/api/playlist', previewLimiter, async (req, res) => {
    const { url } = req.body;
    const playlistId = uuidv4();
    
    try {
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Playlist URL is required',
                code: 'MISSING_URL'
            });
        }
        
        console.log(`📋 [${playlistId}] Fetching playlist info: ${url}`);
        
        // Get playlist information
        const playlistTitle = await executeCommand('yt-dlp', ['--get-filename', '-o', '%(playlist_title)s', url])
            .catch(() => 'Unknown Playlist');
        
        const playlistCount = await executeCommand('yt-dlp', ['--get-filename', '-o', '%(playlist_count)s', url])
            .catch(() => '0');
        
        // Get individual video URLs from playlist
        const videoUrls = await executeCommand('yt-dlp', ['--get-url', '--flat-playlist', url])
            .then(output => output.split('\n').filter(line => line.trim()))
            .catch(() => []);
        
        // Get basic info for first few videos as preview
        const previewVideos = [];
        const maxPreview = Math.min(5, videoUrls.length);
        
        for (let i = 0; i < maxPreview; i++) {
            try {
                const videoUrl = videoUrls[i];
                const videoInfo = await getVideoInfo(videoUrl);
                previewVideos.push({
                    url: videoUrl,
                    title: videoInfo.title,
                    thumbnail: videoInfo.thumbnail,
                    duration: videoInfo.duration
                });
            } catch (error) {
                console.warn(`Warning: Could not get info for video ${i + 1}`);
            }
        }
        
        res.json({
            success: true,
            playlistId,
            playlistTitle,
            totalVideos: parseInt(playlistCount) || videoUrls.length,
            videoUrls,
            previewVideos,
            note: 'Use /api/batch-convert with videoUrls to convert the entire playlist'
        });
        
    } catch (error) {
        console.error(`❌ [${playlistId}] Playlist fetch error:`, error);
        res.status(500).json({
            success: false,
            playlistId,
            error: error.message || 'Failed to fetch playlist information',
            code: 'PLAYLIST_ERROR'
        });
    }
});

// New Feature: Format support endpoint (MP4, WAV, FLAC)
app.post('/api/convert-format', conversionLimiter, async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    let tempFiles = [];
    
    try {
        const { url, format = 'mp3', audioQuality = '320', videoQuality = '720', metadata = {} } = req.body;
        
        // Validate input
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required',
                code: 'MISSING_URL'
            });
        }
        
        const validFormats = ['mp3', 'wav', 'flac', 'mp4', 'm4a'];
        if (!validFormats.includes(format)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid format. Supported: ' + validFormats.join(', '),
                code: 'INVALID_FORMAT'
            });
        }
        
        console.log(`🎵 [${requestId}] Starting ${format.toUpperCase()} conversion: ${url}`);
        
        // Get video info
        const videoInfo = await getVideoInfo(url);
        
        // Generate unique filename
        const uniqueId = uuidv4();
        const tempPath = `temp/${uniqueId}_temp`;
        const outputPath = `downloads/${uniqueId}.${format}`;
        
        if (format === 'mp4') {
            // Video conversion
            await executeCommand('yt-dlp', [
                '-f', `best[height<=${videoQuality}]`,
                '-o', tempPath + '.%(ext)s',
                url
            ]);
            
            const tempVideoFile = await fs.readdir('temp')
                .then(files => files.find(f => f.startsWith(uniqueId + '_temp')))
                .then(file => `temp/${file}`);
            
            tempFiles.push(tempVideoFile);
            
            // Convert to MP4 with ffmpeg
            await executeCommand('ffmpeg', [
                '-i', tempVideoFile,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:a', `${audioQuality}k`,
                '-y',
                outputPath
            ]);
        } else {
            // Audio-only conversion
            const downloadedFile = await downloadAudio(url, tempPath);
            tempFiles.push(downloadedFile);
            
            const ffmpegArgs = ['-i', downloadedFile];
            
            switch (format) {
                case 'mp3':
                    ffmpegArgs.push('-acodec', 'libmp3lame', '-b:a', `${audioQuality}k`);
                    break;
                case 'wav':
                    ffmpegArgs.push('-acodec', 'pcm_s16le');
                    break;
                case 'flac':
                    ffmpegArgs.push('-acodec', 'flac');
                    break;
                case 'm4a':
                    ffmpegArgs.push('-acodec', 'aac', '-b:a', `${audioQuality}k`);
                    break;
            }
            
            // Add metadata
            if (metadata.title || videoInfo.title) {
                ffmpegArgs.push('-metadata', `title=${metadata.title || videoInfo.title}`);
            }
            if (metadata.artist) {
                ffmpegArgs.push('-metadata', `artist=${metadata.artist}`);
            }
            
            ffmpegArgs.push('-y', outputPath);
            
            await executeCommand('ffmpeg', ffmpegArgs);
        }
        
        // Clean up temporary files
        await enhancedCleanupFiles(tempFiles);
        
        const downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${uniqueId}.${format}`;
        const processingTime = Date.now() - startTime;
        
        // Schedule file cleanup
        setTimeout(async () => {
            try {
                await fs.unlink(outputPath);
                console.log(`🧹 [${requestId}] Auto-cleaned: ${outputPath}`);
            } catch (error) {
                console.error(`❌ [${requestId}] Failed to auto-cleanup ${outputPath}:`, error.message);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        console.log(`✅ [${requestId}] ${format.toUpperCase()} conversion completed in ${processingTime}ms`);
        
        res.json({
            success: true,
            requestId,
            format,
            videoTitle: videoInfo.title,
            thumbnailUrl: videoInfo.thumbnail,
            duration: videoInfo.duration,
            downloadUrl,
            audioQuality: format === 'mp4' ? null : audioQuality,
            videoQuality: format === 'mp4' ? videoQuality : null,
            processingTime: `${processingTime}ms`
        });
        
    } catch (error) {
        console.error(`❌ [${requestId}] Format conversion error:`, error);
        await enhancedCleanupFiles(tempFiles);
        
        res.status(500).json({
            success: false,
            requestId,
            error: error.message || 'Format conversion failed',
            code: 'FORMAT_CONVERSION_ERROR'
        });
    }
});


// Cleanup old files every hour
cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled cleanup...');
    try {
        const downloadsDir = 'downloads';
        const files = await fs.readdir(downloadsDir);
        const now = Date.now();
        
        for (const file of files) {
            const filePath = path.join(downloadsDir, file);
            const stats = await fs.stat(filePath);
            const ageInMinutes = (now - stats.mtime.getTime()) / (1000 * 60);
            
            // Delete files older than 30 minutes
            if (ageInMinutes > 30) {
                await fs.unlink(filePath);
                console.log(`Cleaned up old file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
});

// Start server
initDirectories().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 TubeConv server running on port ${PORT}`);
        console.log(`📁 Make sure yt-dlp and ffmpeg are installed and in PATH`);
    });
}).catch(error => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
});
