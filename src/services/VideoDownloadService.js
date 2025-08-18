const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class VideoDownloadService {
  constructor() {
    this.ytDlp = new YTDlpWrap();
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  // Extract video metadata without downloading
  async getVideoInfo(url) {
    try {
      const info = await this.ytDlp.getVideoInfo(url);
      
      return {
        title: info.title || 'Unknown Title',
        platform: this.extractPlatform(url),
        duration: info.duration || null,
        thumbnailUrl: info.thumbnail || null,
        uploader: info.uploader || null,
        uploadDate: info.upload_date || null,
        description: info.description || null,
        viewCount: info.view_count || null,
        originalUrl: url
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      throw new Error(`Failed to extract video information: ${error.message}`);
    }
  }

  // Download video and return file path
  async downloadVideo(url, options = {}) {
    const videoId = uuidv4();
    const outputPath = path.join(this.tempDir, `${videoId}.%(ext)s`);
    
    const downloadOptions = {
      format: 'best[ext=mp4]/mp4/best',
      output: outputPath,
      noPlaylist: true,
      extractFlat: false,
      ...options
    };

    try {
      // Check if video is accessible first
      await this.getVideoInfo(url);
      
      // Download the video
      await this.ytDlp.exec([
        url,
        '--format', downloadOptions.format,
        '--output', downloadOptions.output,
        '--no-playlist',
        '--extract-flat', 'false'
      ]);

      // Find the actual downloaded file (yt-dlp replaces %(ext)s with actual extension)
      const files = await fs.readdir(this.tempDir);
      const downloadedFile = files.find(file => file.startsWith(videoId));
      
      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }

      const fullPath = path.join(this.tempDir, downloadedFile);
      const stats = await fs.stat(fullPath);
      
      return {
        filePath: fullPath,
        fileName: downloadedFile,
        fileSize: stats.size,
        extension: path.extname(downloadedFile)
      };
    } catch (error) {
      console.error('Error downloading video:', error);
      // Clean up any partial downloads
      await this.cleanupFile(outputPath);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  // Extract platform from URL
  extractPlatform(url) {
    const lowercaseUrl = url.toLowerCase();
    
    if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
      return 'youtube';
    } else if (lowercaseUrl.includes('instagram.com')) {
      return 'instagram';
    } else if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) {
      return 'twitter';
    } else if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.com')) {
      return 'facebook';
    } else if (lowercaseUrl.includes('tiktok.com')) {
      return 'tiktok';
    }
    
    return 'unknown';
  }

  // Clean up temporary files
  async cleanupFile(filePath) {
    try {
      // Handle glob patterns from yt-dlp
      if (filePath.includes('%(ext)s')) {
        const basePattern = filePath.replace('.%(ext)s', '');
        const dir = path.dirname(basePattern);
        const baseName = path.basename(basePattern);
        
        const files = await fs.readdir(dir);
        const filesToDelete = files.filter(file => file.startsWith(baseName));
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(dir, file));
        }
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }

  // Validate URL format
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Check if platform is supported
  isSupportedPlatform(url) {
    const platform = this.extractPlatform(url);
    const allowedPlatforms = (process.env.ALLOWED_PLATFORMS || 'youtube,instagram,twitter,facebook,tiktok').split(',');
    return allowedPlatforms.includes(platform);
  }
}

module.exports = VideoDownloadService;