# TubeConv - YouTube to MP3 Converter

A modern, clean web application that converts YouTube videos to high-quality MP3 files using yt-dlp and ffmpeg.

## Features

- **Modern UI/UX**: Clean, responsive design with dark theme
- **High-Quality Audio**: Support for 128kbps, 192kbps, 256kbps, and 320kbps bitrates
- **Custom Metadata**: Add custom title and artist information
- **Real-time Processing**: Live conversion status with progress indicators
- **Auto-cleanup**: Temporary files are automatically deleted after 30 minutes
- **Mobile Friendly**: Fully responsive design for all devices

## Prerequisites

Before running the application, ensure you have the following installed:

### Required Dependencies

1. **Node.js** (v14 or higher)
   ```bash
   # Check if installed
   node --version
   npm --version
   ```

2. **yt-dlp** (YouTube downloader)
   ```bash
   # macOS (using Homebrew)
   brew install yt-dlp
   
   # Or using pip
   pip install yt-dlp
   
   # Verify installation
   yt-dlp --version
   ```

3. **ffmpeg** (Audio processing)
   ```bash
   # macOS (using Homebrew)
   brew install ffmpeg
   
   # Verify installation
   ffmpeg -version
   ```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tubeconv
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install system dependencies (if not already installed)**
   ```bash
   npm run install-deps
   ```

## Usage

### Development Mode
```bash
npm run dev
```
This starts the server with automatic restart on file changes using nodemon.

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### POST /api/convert
Converts a YouTube video to MP3 format.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "audioQuality": "320",
  "metadata": {
    "title": "Custom Title",
    "artist": "Custom Artist"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "videoTitle": "Rick Astley - Never Gonna Give You Up",
  "thumbnailUrl": "https://...",
  "duration": "3:32",
  "downloadUrl": "http://localhost:3000/downloads/unique-filename.mp3",
  "audioQuality": "320"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid YouTube URL provided."
}
```

### GET /api/health
Health check endpoint that returns server status.

## Project Structure

```
tubeconv/
├── package.json          # Node.js dependencies and scripts
├── server.js             # Express.js backend server
├── public/               # Frontend files
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styles
│   └── script.js         # Frontend JavaScript
├── temp/                 # Temporary audio files (auto-created)
├── downloads/            # Generated MP3 files (auto-created)
└── README.md            # This file
```

## Configuration

### Environment Variables
You can set the following environment variables:

- `PORT`: Server port (default: 3000)

### Audio Quality Options
- `128`: 128 kbps (Good quality, smaller file size)
- `192`: 192 kbps (Better quality)
- `256`: 256 kbps (Great quality)
- `320`: 320 kbps (Best quality, larger file size) - **Default**

## File Cleanup

The application automatically cleans up files to prevent storage issues:

- **Temporary files**: Deleted immediately after conversion
- **Generated MP3 files**: Deleted after 30 minutes
- **Scheduled cleanup**: Runs every hour to remove old files

## Troubleshooting

### Command not found: yt-dlp
Make sure yt-dlp is installed and available in your PATH:
```bash
which yt-dlp
yt-dlp --version
```

### Command not found: ffmpeg
Make sure ffmpeg is installed and available in your PATH:
```bash
which ffmpeg
ffmpeg -version
```

### Port already in use
If port 3000 is already in use, you can specify a different port:
```bash
PORT=8080 npm start
```

### Conversion fails
- Ensure the YouTube URL is valid and accessible
- Check that the video is not private or restricted
- Verify that yt-dlp can access the video:
  ```bash
  yt-dlp --get-title "https://www.youtube.com/watch?v=VIDEO_ID"
  ```

## Browser Support

- Chrome/Chromium 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Security Considerations

- The application validates YouTube URLs before processing
- Temporary files are stored in isolated directories
- Files are automatically cleaned up to prevent storage exhaustion
- CORS is properly configured for cross-origin requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Create a pull request

## License

This project is licensed under the MIT License - see the package.json file for details.

## Disclaimer

This tool is for personal use only. Please respect YouTube's Terms of Service and copyright laws. Only download content you have permission to use.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Ensure all prerequisites are properly installed
3. Check the browser console for error messages
4. Verify the server logs for backend issues
