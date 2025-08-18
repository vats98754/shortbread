const VideoIngestionService = require('../src/services/VideoIngestionService');
const VideoDownloadService = require('../src/services/VideoDownloadService');
const StorageService = require('../src/services/StorageService');
const VideoModel = require('../src/models/Video');

// Mock all dependencies
jest.mock('../src/services/VideoDownloadService');
jest.mock('../src/services/StorageService');
jest.mock('../src/models/Video');

describe('VideoIngestionService', () => {
  let service;
  let mockDownloadService;
  let mockStorageService;
  let mockVideoModel;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDownloadService = new VideoDownloadService();
    mockStorageService = new StorageService();
    mockVideoModel = new VideoModel();

    service = new VideoIngestionService();
    service.downloadService = mockDownloadService;
    service.storageService = mockStorageService;
    service.videoModel = mockVideoModel;
  });

  describe('processVideo', () => {
    const validUrl = 'https://youtube.com/watch?v=test123';
    const validUserId = 'user-123';

    const mockVideoInfo = {
      title: 'Test Video',
      platform: 'youtube',
      duration: 120,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      uploader: 'Test Channel',
      uploadDate: '20231201',
      description: 'Test description',
      viewCount: 1000
    };

    const mockDownloadResult = {
      filePath: '/tmp/test-video.mp4',
      fileName: 'test-video.mp4',
      fileSize: 1024000,
      extension: '.mp4'
    };

    const mockUploadResult = {
      url: 'https://storage.example.com/video.mp4',
      key: 'videos/user-123/video.mp4',
      bucket: 'test-bucket',
      size: 1024000
    };

    const mockThumbnailUpload = {
      url: 'https://storage.example.com/thumb.jpg',
      key: 'thumbnails/user-123/thumb.jpg'
    };

    const mockVideoRecord = {
      id: 'video-123',
      title: 'Test Video',
      thumbnail_url: 'https://storage.example.com/thumb.jpg',
      storage_url: 'https://storage.example.com/video.mp4'
    };

    beforeEach(() => {
      mockDownloadService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockDownloadService.downloadVideo.mockResolvedValue(mockDownloadResult);
      mockDownloadService.cleanupFile.mockResolvedValue();
      mockDownloadService.isValidUrl.mockReturnValue(true);
      mockDownloadService.isSupportedPlatform.mockReturnValue(true);
      
      mockStorageService.uploadFile.mockResolvedValue(mockUploadResult);
      mockStorageService.uploadThumbnail.mockResolvedValue(mockThumbnailUpload);
      
      mockVideoModel.create.mockResolvedValue(mockVideoRecord);
    });

    it('should process video successfully', async () => {
      const result = await service.processVideo(validUrl, validUserId);

      expect(result).toEqual({
        videoId: 'video-123',
        title: 'Test Video',
        thumbnailUrl: 'https://storage.example.com/thumb.jpg',
        storageUrl: 'https://storage.example.com/video.mp4'
      });

      expect(mockDownloadService.getVideoInfo).toHaveBeenCalledWith(validUrl);
      expect(mockDownloadService.downloadVideo).toHaveBeenCalledWith(validUrl);
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        '/tmp/test-video.mp4',
        'user-123',
        'test-video.mp4'
      );
      expect(mockStorageService.uploadThumbnail).toHaveBeenCalledWith(
        'https://example.com/thumb.jpg',
        'user-123'
      );
      expect(mockVideoModel.create).toHaveBeenCalled();
      expect(mockDownloadService.cleanupFile).toHaveBeenCalledWith('/tmp/test-video.mp4');
    });

    it('should handle download failure with retry', async () => {
      mockDownloadService.downloadVideo
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDownloadResult);

      const result = await service.processVideo(validUrl, validUserId);

      expect(result.videoId).toBe('video-123');
      expect(mockDownloadService.downloadVideo).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockDownloadService.downloadVideo.mockRejectedValue(new Error('Persistent error'));

      await expect(service.processVideo(validUrl, validUserId))
        .rejects.toThrow('download failed after 3 attempts');

      expect(mockDownloadService.downloadVideo).toHaveBeenCalledTimes(3);
    });

    it('should clean up on error', async () => {
      mockStorageService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(service.processVideo(validUrl, validUserId))
        .rejects.toThrow('Upload failed');

      expect(mockDownloadService.cleanupFile).toHaveBeenCalledWith('/tmp/test-video.mp4');
    });
  });

  describe('validateInputs', () => {
    it('should validate URL format', () => {
      expect(() => service.validateInputs('not-a-url', 'user-123'))
        .toThrow('Invalid URL format');
    });

    it('should validate required fields', () => {
      expect(() => service.validateInputs('', 'user-123'))
        .toThrow('URL is required');

      expect(() => service.validateInputs('https://youtube.com/test', ''))
        .toThrow('User ID is required');
    });

    it('should validate supported platforms', () => {
      mockDownloadService.isValidUrl.mockReturnValue(true);
      mockDownloadService.isSupportedPlatform.mockReturnValue(false);
      mockDownloadService.extractPlatform.mockReturnValue('unsupported');

      expect(() => service.validateInputs('https://unsupported.com/test', 'user-123'))
        .toThrow('Platform \'unsupported\' is not supported');
    });

    it('should pass valid inputs', () => {
      mockDownloadService.isValidUrl.mockReturnValue(true);
      mockDownloadService.isSupportedPlatform.mockReturnValue(true);

      expect(() => service.validateInputs('https://youtube.com/test', 'user-123'))
        .not.toThrow();
    });
  });

  describe('getUserVideos', () => {
    it('should get user videos with default pagination', async () => {
      const mockVideos = [{ id: 'video-1' }, { id: 'video-2' }];
      mockVideoModel.getByUserId.mockResolvedValue(mockVideos);

      const result = await service.getUserVideos('user-123');

      expect(result).toEqual(mockVideos);
      expect(mockVideoModel.getByUserId).toHaveBeenCalledWith('user-123', 50, 0);
    });

    it('should get user videos with custom pagination', async () => {
      const mockVideos = [{ id: 'video-1' }];
      mockVideoModel.getByUserId.mockResolvedValue(mockVideos);

      const result = await service.getUserVideos('user-123', 10, 20);

      expect(result).toEqual(mockVideos);
      expect(mockVideoModel.getByUserId).toHaveBeenCalledWith('user-123', 10, 20);
    });
  });

  describe('deleteVideo', () => {
    it('should delete video and clean up storage', async () => {
      const mockVideo = {
        id: 'video-123',
        metadata: {
          storageKey: 'videos/user-123/video.mp4',
          thumbnailKey: 'thumbnails/user-123/thumb.jpg'
        }
      };

      mockVideoModel.getById.mockResolvedValue(mockVideo);
      mockStorageService.deleteFile.mockResolvedValue();
      mockVideoModel.delete.mockResolvedValue();

      const result = await service.deleteVideo('video-123');

      expect(result).toBe(true);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('videos/user-123/video.mp4');
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('thumbnails/user-123/thumb.jpg');
      expect(mockVideoModel.delete).toHaveBeenCalledWith('video-123');
    });

    it('should throw error for non-existent video', async () => {
      mockVideoModel.getById.mockResolvedValue(null);

      await expect(service.deleteVideo('non-existent'))
        .rejects.toThrow('Video not found');
    });
  });
});