const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve downloads directory
app.use('/downloads', express.static('downloads'));

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

// API endpoint for conversion
app.post('/api/convert', async (req, res) => {
    let tempFiles = [];
    
    try {
        const { url, audioQuality = '320', metadata = {} } = req.body;
        
        // Validate input
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'YouTube URL is required'
            });
        }
        
        if (!isValidYouTubeUrl(url)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid YouTube URL provided'
            });
        }
        
        const validQualities = ['128', '192', '256', '320'];
        if (!validQualities.includes(audioQuality)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid audio quality. Must be 128, 192, 256, or 320'
            });
        }
        
        // Generate unique filename
        const uniqueId = uuidv4();
        const tempAudioPath = path.join('temp', `${uniqueId}_audio`);
        const outputMp3Path = path.join('downloads', `${uniqueId}.mp3`);
        
        // Get video information
        console.log('Fetching video information...');
        const videoInfo = await getVideoInfo(url);
        
        // Download audio
        console.log('Downloading audio...');
        const downloadedAudioPath = await downloadAudio(url, tempAudioPath);
        tempFiles.push(downloadedAudioPath);
        
        // Convert to MP3
        console.log('Converting to MP3...');
        await convertToMp3(downloadedAudioPath, outputMp3Path, audioQuality, metadata);
        
        // Clean up temporary files
        await cleanupFiles(tempFiles);
        
        // Prepare download URL
        const downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${uniqueId}.mp3`;
        
        // Schedule file cleanup (delete after 30 minutes)
        setTimeout(async () => {
            try {
                await fs.unlink(outputMp3Path);
                console.log(`Cleaned up ${outputMp3Path}`);
            } catch (error) {
                console.error(`Failed to cleanup ${outputMp3Path}:`, error.message);
            }
        }, 30 * 60 * 1000); // 30 minutes
        
        res.json({
            success: true,
            videoTitle: videoInfo.title,
            thumbnailUrl: videoInfo.thumbnail,
            duration: videoInfo.duration,
            downloadUrl: downloadUrl,
            audioQuality: audioQuality
        });
        
    } catch (error) {
        console.error('Conversion error:', error);
        
        // Clean up any temporary files on error
        await cleanupFiles(tempFiles);
        
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred during conversion'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
