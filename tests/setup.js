// Test setup file
process.env.NODE_ENV = 'test';
process.env.PORT = 0; // Use random port for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/shortbread_test';
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.STORAGE_PROVIDER = 's3';
process.env.MAX_VIDEO_SIZE_MB = '50';
process.env.ALLOWED_PLATFORMS = 'youtube,instagram,twitter,facebook,tiktok';

// Mock external dependencies for testing
jest.mock('yt-dlp-wrap', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      getVideoInfo: jest.fn(),
      exec: jest.fn()
    }))
  };
});

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn()
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn()
    }),
    getSignedUrl: jest.fn(),
    listObjectsV2: jest.fn().mockReturnValue({
      promise: jest.fn()
    })
  }))
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    on: jest.fn()
  }))
}));