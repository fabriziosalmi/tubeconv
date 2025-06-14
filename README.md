# 🎵 TubeConv - Universal Video to MP3 Converter

> A modern, blazing-fast web application that converts videos from **1000+ sites** to high-quality MP3 files with a beautiful, responsive interface.

![screenshot](https://github.com/fabriziosalmi/tubeconv/blob/main/screenshot_1.png?raw=true)

## 🌐 **Supported Sites**

TubeConv supports **over 1000 video platforms** thanks to the powerful [yt-dlp](https://github.com/yt-dlp/yt-dlp) backend, including:

- **🎥 YouTube** - The world's largest video platform
- **📱 TikTok** - Short-form videos and trending content  
- **📷 Instagram** - Stories, reels, and posts
- **🎬 Vimeo** - Professional video hosting
- **🎮 Twitch** - Gaming streams and clips
- **📘 Facebook** - Social media videos
- **🐦 Twitter/X** - Tweet videos and clips
- **🎪 Dailymotion** - European video platform
- **🎧 SoundCloud** - Music and audio content
- **💬 Reddit** - Community videos

**And hundreds more!** See the [complete list of supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) for all platforms.

## ✨ Features

### 🎨 **Modern Interface**
- **Auto Light/Dark Theme**: Automatically adapts to your system preference
- **Glassmorphic Design**: Beautiful, modern UI with backdrop blur effects
- **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Intuitive UX**: Simple 3-step process with visual guidance

### 🎵 **High-Quality Audio**
- **Multiple Bitrates**: 128, 192, 256, and 320 kbps options
- **Custom Metadata**: Add custom title and artist information
- **Thumbnail Preview**: See video thumbnail during conversion
- **Format Support**: High-quality MP3 output with proper encoding

### ⚡ **Performance & Reliability**
- **Real-time Progress**: Live conversion status with animated indicators
- **Auto-cleanup**: Smart file management with automatic deletion
- **Fast Processing**: Optimized backend with efficient handling
- **Background Tasks**: Non-blocking conversion process

### 🔧 **Developer Features**
- **RESTful API**: Complete API documentation with Swagger
- **Docker Support**: Containerized deployment ready
- **CI/CD Pipeline**: Automated testing and deployment
- **Comprehensive Tests**: Full test coverage for reliability

## 🚀 Quick Start

### 🐳 Option 1: Docker (Recommended)

The fastest way to get started:

```bash
# Run with Docker (no dependencies needed!)
docker run -d --name tubeconv -p 3000:3000 fabriziosalmi/tubeconv:latest

# Open http://localhost:3000 and start converting! 🎉
```

### 💻 Option 2: Local Installation

#### Prerequisites

Ensure you have these installed:

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Node.js** | v14+ | [Download](https://nodejs.org/) |
| **yt-dlp** | Latest | `pip install yt-dlp` or `brew install yt-dlp` |
| **ffmpeg** | Latest | `brew install ffmpeg` or [Download](https://ffmpeg.org/) |

#### Installation

```bash
# Clone the repository
git clone https://github.com/fabriziosalmi/tubeconv.git
cd tubeconv

# Install dependencies
npm install

# Start the application
npm start
```

🎉 **That's it!** Open [http://localhost:3000](http://localhost:3000) and start converting!

## ⚖️ Legal Disclaimer

> **⚠️ Important**: TubeConv is designed for personal use and educational purposes only. Please ensure you have the right to download and convert content from any platform. Respect copyright laws, terms of service, and content creators' rights. Users are solely responsible for compliance with applicable laws and regulations in their jurisdiction.

## 📖 Usage Guide

### Web Interface
1. **Paste Video URL** - Copy any video URL from supported sites (YouTube, TikTok, Instagram, etc.)
2. **Click Convert to MP3** - Choose your preferred audio quality (128-320 kbps)
3. **Download MP3** - Get your high-quality audio file

### API Usage

```javascript
// Convert videos from any supported platform
const response = await fetch('/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // YouTube
    // url: 'https://www.tiktok.com/@user/video/1234567890', // TikTok
    // url: 'https://vimeo.com/123456789', // Vimeo
    audioQuality: '320'
  })
});

const result = await response.json();
console.log('Download URL:', result.downloadUrl);
```

## 🔗 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/convert` | Convert YouTube video to MP3 |
| `GET` | `/api/preview` | Get video information and thumbnail |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api-docs` | Interactive Swagger documentation |

### Example Response

```json
{
  "success": true,
  "videoTitle": "Amazing Song Title",
  "thumbnailUrl": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
  "duration": "3:45",
  "downloadUrl": "http://localhost:3000/downloads/unique-file.mp3",
  "audioQuality": "320",
  "processingTime": "2.3s"
}
```

## 🏗️ Project Structure

```
tubeconv/
├── 📄 package.json          # Dependencies and scripts
├── 🖥️  server.js             # Express.js backend
├── 🌐 public/               # Frontend assets
│   ├── 📝 index.html        # Main application
│   ├── 🎨 styles.css        # Modern CSS with themes
│   ├── ⚙️  script.js         # Frontend logic
│   ├── 🔧 manifest.json     # PWA manifest
│   └── 👷 sw.js             # Service worker
├── 🐳 Dockerfile           # Container configuration
├── ⚡ docker-compose.yml   # Development environment
├── 🧪 tests/               # Test suites
├── 📋 swagger.json         # API documentation
└── 📖 README.md            # This file
```

## 🐳 Docker Deployment

### 🚀 Quick Start with Docker Hub

The easiest way to run TubeConv is using our pre-built Docker image from Docker Hub:

```bash
# Pull and run the latest version
docker run -d \
  --name tubeconv \
  -p 3000:3000 \
  --restart unless-stopped \
  fabriziosalmi/tubeconv:latest

# Access at http://localhost:3000
```

### 📦 Available Docker Images

| Tag | Description | Size |
|-----|-------------|------|
| `fabriziosalmi/tubeconv:latest` | Latest stable release | ~150MB |

### 🔧 Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  tubeconv:
    image: fabriziosalmi/tubeconv:latest
    container_name: tubeconv
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - tubeconv_downloads:/app/downloads
      - tubeconv_temp:/app/temp
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

volumes:
  tubeconv_downloads:
  tubeconv_temp:
```

Then run:
```bash
docker-compose up -d
```

### 🛠️ Build Your Own Image

If you want to build from source:

```bash
# Clone the repository
git clone https://github.com/fabriziosalmi/tubeconv.git
cd tubeconv

# Build the image
docker build -t tubeconv .

# Run your custom build
docker run -p 3000:3000 tubeconv
```

### 🔄 Multi-Architecture Support

Our Docker images support multiple architectures:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple M1/M2, Raspberry Pi 4)

### ⚙️ Environment Variables

Configure the container with these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment mode |
| `CLEANUP_INTERVAL` | `3600000` | File cleanup interval (ms) |
| `FILE_RETENTION` | `1800000` | File retention time (ms) |

### 📁 Persistent Storage

To persist downloads and avoid losing files:

```bash
docker run -d \
  --name tubeconv \
  -p 3000:3000 \
  -v tubeconv_downloads:/app/downloads \
  -v tubeconv_temp:/app/temp \
  fabriziosalmi/tubeconv:latest
```

### 🔄 Updates

To update to the latest version:

```bash
# Stop and remove the old container
docker stop tubeconv && docker rm tubeconv

# Pull the latest image
docker pull fabriziosalmi/tubeconv:latest

# Start with the new image
docker run -d \
  --name tubeconv \
  -p 3000:3000 \
  --restart unless-stopped \
  fabriziosalmi/tubeconv:latest
```

### 🐛 Docker Troubleshooting

<details>
<summary><strong>Container won't start</strong></summary>

```bash
# Check container logs
docker logs tubeconv

# Check if port is already in use
docker run -p 8080:3000 fabriziosalmi/tubeconv:latest
```
</details>

<details>
<summary><strong>Permission issues</strong></summary>

```bash
# Run with specific user
docker run --user 1001:1001 -p 3000:3000 fabriziosalmi/tubeconv:latest
```
</details>

<details>
<summary><strong>Performance issues</strong></summary>

```bash
# Allocate more resources
docker run -m 512m --cpus 2 -p 3000:3000 fabriziosalmi/tubeconv:latest
```
</details>

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Watch mode for development
npm run test:watch
```

## 🔧 Configuration

### Audio Quality Settings
- **128 kbps**: Good quality, smaller files (~1MB/minute)
- **192 kbps**: Better quality, balanced size (~1.5MB/minute)
- **256 kbps**: Great quality, larger files (~2MB/minute)
- **320 kbps**: Best quality, largest files (~2.5MB/minute) ⭐ *Default*

### File Management
- **Auto-cleanup**: Files deleted after 30 minutes
- **Storage limit**: Configurable maximum storage usage
- **Batch processing**: Multiple conversions handled efficiently

## 🛠️ Development

### Development Mode
```bash
# Start with hot reload
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

### Contributing Guidelines
1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💫 Make your changes with proper tests
4. ✅ Ensure all tests pass (`npm test`)
5. 📝 Update documentation if needed
6. 🚀 Create a Pull Request

## 🔍 Troubleshooting

<details>
<summary><strong>❌ Command not found: yt-dlp</strong></summary>

```bash
# Install yt-dlp
pip install yt-dlp
# or
brew install yt-dlp

# Verify installation
yt-dlp --version
```
</details>

<details>
<summary><strong>❌ Command not found: ffmpeg</strong></summary>

```bash
# Install ffmpeg
brew install ffmpeg
# or download from https://ffmpeg.org/

# Verify installation
ffmpeg -version
```
</details>

<details>
<summary><strong>❌ Port already in use</strong></summary>

```bash
# Use different port
PORT=8080 npm start

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```
</details>

<details>
<summary><strong>❌ Conversion fails</strong></summary>

1. Verify the YouTube URL is accessible
2. Check if video is private/restricted
3. Test with yt-dlp directly:
   ```bash
   yt-dlp --get-title "YOUR_YOUTUBE_URL"
   ```
4. Check server logs for detailed errors
</details>

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|---------|
| Chrome | 70+ | ✅ Fully Supported |
| Firefox | 65+ | ✅ Fully Supported |
| Safari | 12+ | ✅ Fully Supported |
| Edge | 79+ | ✅ Fully Supported |

## 🔒 Security & Privacy

- ✅ **URL Validation**: Strict YouTube URL validation
- ✅ **File Isolation**: Temporary files in secure directories
- ✅ **Auto-cleanup**: Prevents storage exhaustion
- ✅ **CORS Protection**: Proper cross-origin configuration
- ✅ **Rate Limiting**: Prevents abuse and overload
- ✅ **Input Sanitization**: All inputs properly validated

## 📊 Performance

- ⚡ **Conversion Speed**: ~10-30 seconds per video
- 💾 **Memory Usage**: ~50-100MB average
- 🗄️ **Storage**: Auto-managed with cleanup
- 🔄 **Concurrent Users**: Supports multiple simultaneous conversions

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## ⚠️ Legal Disclaimer

**Important**: This tool is for personal use only. Please respect:
- 📋 YouTube's Terms of Service
- ©️ Copyright laws and intellectual property rights
- 🎵 Only download content you have permission to use
- 🌍 Local laws and regulations regarding content downloading

## 💝 Support & Credits

<div align="center">

**Made with ❤️ by [Fabrizio Salmi](https://github.com/fabriziosalmi)**

[![GitHub Stars](https://img.shields.io/github/stars/fabriziosalmi/tubeconv?style=social)](https://github.com/fabriziosalmi/tubeconv/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/fabriziosalmi/tubeconv?style=social)](https://github.com/fabriziosalmi/tubeconv/network/members)
[![Docker Pulls](https://img.shields.io/docker/pulls/fabriziosalmi/tubeconv)](https://hub.docker.com/r/fabriziosalmi/tubeconv)
[![GitHub Issues](https://img.shields.io/github/issues/fabriziosalmi/tubeconv)](https://github.com/fabriziosalmi/tubeconv/issues)
[![License](https://img.shields.io/github/license/fabriziosalmi/tubeconv)](https://github.com/fabriziosalmi/tubeconv/blob/main/LICENSE)

</div>

### 🆘 Need Help?

1. 📖 Check this README for common solutions
2. 🔍 Search [existing issues](https://github.com/fabriziosalmi/tubeconv/issues)
3. 🐛 Create a [new issue](https://github.com/fabriziosalmi/tubeconv/issues/new) with details
4. 💬 Join our [discussions](https://github.com/fabriziosalmi/tubeconv/discussions)

### 🙏 Special Thanks

- **yt-dlp team** for the amazing YouTube downloader
- **ffmpeg contributors** for audio processing capabilities
- **Open source community** for inspiration and feedback

---

<div align="center">
  <strong>⭐ If you find this project useful, please give it a star! ⭐</strong>
</div>
