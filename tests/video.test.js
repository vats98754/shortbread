const request = require('supertest');
const app = require('../src/index');

describe('Video Ingestion API', () => {
  describe('POST /video/save', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/video/save')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('URL is required');
      expect(response.body.details).toContain('userId is required');
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/video/save')
        .send({
          url: 'not-a-valid-url',
          userId: 'test-user'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('URL must be a valid URL');
    });

    it('should validate userId format', async () => {
      const response = await request(app)
        .post('/video/save')
        .send({
          url: 'https://youtube.com/watch?v=test',
          userId: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('userId is required');
    });

    it('should reject extra fields', async () => {
      const response = await request(app)
        .post('/video/save')
        .send({
          url: 'https://youtube.com/watch?v=test',
          userId: 'test-user',
          extraField: 'not-allowed'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('Unexpected fields: extraField');
    });

    it('should accept valid input format', async () => {
      // Mock the video ingestion service to avoid actual processing
      const VideoIngestionService = require('../src/services/VideoIngestionService');
      const mockProcessVideo = jest.spyOn(VideoIngestionService.prototype, 'processVideo')
        .mockResolvedValue({
          videoId: 'test-video-id',
          title: 'Test Video',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          storageUrl: 'https://example.com/video.mp4'
        });

      const response = await request(app)
        .post('/video/save')
        .send({
          url: 'https://youtube.com/watch?v=test',
          userId: 'test-user'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('videoId');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('thumbnailUrl');
      expect(response.body.data).toHaveProperty('storageUrl');
      expect(mockProcessVideo).toHaveBeenCalledWith('https://youtube.com/watch?v=test', 'test-user');

      mockProcessVideo.mockRestore();
    });
  });

  describe('GET /video/:id', () => {
    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/video/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid video ID format');
    });

    it('should return 404 for non-existent video', async () => {
      // Mock the video ingestion service
      const VideoIngestionService = require('../src/services/VideoIngestionService');
      const mockGetVideo = jest.spyOn(VideoIngestionService.prototype, 'getVideo')
        .mockResolvedValue(null);

      const response = await request(app)
        .get('/video/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Video not found');

      mockGetVideo.mockRestore();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});