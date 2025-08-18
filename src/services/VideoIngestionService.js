const VideoDownloadService = require('./VideoDownloadService');
const StorageService = require('./StorageService');
const VideoModel = require('../models/Video');
const fs = require('fs').promises;

class VideoIngestionService {
  constructor() {
    this.downloadService = new VideoDownloadService();
    this.storageService = new StorageService();
    this.videoModel = new VideoModel();
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  // Main method to process video ingestion
  async processVideo(url, userId) {
    // Validate inputs
    this.validateInputs(url, userId);

    let downloadResult = null;
    let videoRecord = null;

    try {
      // Step 1: Extract video metadata
      const videoInfo = await this.downloadService.getVideoInfo(url);
      console.log(`Processing video: ${videoInfo.title} from ${videoInfo.platform}`);

      // Step 2: Download video with retry logic
      downloadResult = await this.retryOperation(
        () => this.downloadService.downloadVideo(url),
        'download'
      );

      // Step 3: Upload to storage
      const uploadResult = await this.retryOperation(
        () => this.storageService.uploadFile(
          downloadResult.filePath,
          userId,
          downloadResult.fileName
        ),
        'upload'
      );

      // Step 4: Upload thumbnail if available
      let thumbnailUpload = null;
      if (videoInfo.thumbnailUrl) {
        thumbnailUpload = await this.storageService.uploadThumbnail(
          videoInfo.thumbnailUrl,
          userId
        );
      }

      // Step 5: Save to database
      const videoData = {
        userId,
        title: videoInfo.title,
        platform: videoInfo.platform,
        originalUrl: url,
        storageUrl: uploadResult.url,
        thumbnailUrl: thumbnailUpload?.url || videoInfo.thumbnailUrl,
        duration: videoInfo.duration,
        fileSize: downloadResult.fileSize,
        metadata: {
          uploader: videoInfo.uploader,
          uploadDate: videoInfo.uploadDate,
          description: videoInfo.description,
          viewCount: videoInfo.viewCount,
          storageKey: uploadResult.key,
          thumbnailKey: thumbnailUpload?.key
        }
      };

      videoRecord = await this.videoModel.create(videoData);

      // Clean up temporary file
      await this.downloadService.cleanupFile(downloadResult.filePath);

      // Return the response format specified in requirements
      return {
        videoId: videoRecord.id,
        title: videoRecord.title,
        thumbnailUrl: videoRecord.thumbnail_url,
        storageUrl: videoRecord.storage_url
      };

    } catch (error) {
      console.error('Error processing video:', error);
      
      // Clean up on error
      if (downloadResult?.filePath) {
        await this.downloadService.cleanupFile(downloadResult.filePath);
      }

      // Update video status to failed if record exists
      if (videoRecord?.id) {
        await this.videoModel.updateStatus(videoRecord.id, 'failed');
      }

      throw error;
    }
  }

  // Retry operation with exponential backoff
  async retryOperation(operation, operationName) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting ${operationName} (attempt ${attempt}/${this.maxRetries})`);
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(`${operationName} failed on attempt ${attempt}:`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying ${operationName} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  // Validate inputs
  validateInputs(url, userId) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!this.downloadService.isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    if (!this.downloadService.isSupportedPlatform(url)) {
      const platform = this.downloadService.extractPlatform(url);
      throw new Error(`Platform '${platform}' is not supported`);
    }

    // Check video size limits would be done during download
    const maxSizeMB = parseInt(process.env.MAX_VIDEO_SIZE_MB) || 100;
    if (maxSizeMB <= 0) {
      throw new Error('Invalid maximum video size configuration');
    }
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get video by ID (for testing/verification)
  async getVideo(videoId) {
    return await this.videoModel.getById(videoId);
  }

  // Get videos by user ID
  async getUserVideos(userId, limit = 50, offset = 0) {
    return await this.videoModel.getByUserId(userId, limit, offset);
  }

  // Delete video and clean up storage
  async deleteVideo(videoId) {
    const video = await this.videoModel.getById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    try {
      // Delete from storage
      if (video.metadata?.storageKey) {
        await this.storageService.deleteFile(video.metadata.storageKey);
      }
      if (video.metadata?.thumbnailKey) {
        await this.storageService.deleteFile(video.metadata.thumbnailKey);
      }

      // Delete from database
      await this.videoModel.delete(videoId);
      
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }
}

module.exports = VideoIngestionService;