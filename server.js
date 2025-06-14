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

// YouTube URL validation
const isValidYouTubeUrl = (url) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
    return regex.test(url);
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

// Enhanced API endpoints

// Comprehensive health check endpoint
app.get('/api/health', async (req, res) => {
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const health = await getSystemHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve system health'
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
