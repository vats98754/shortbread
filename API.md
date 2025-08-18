# Shortbread Backend API

A video ingestion service that accepts video links from various social media platforms and stores them with metadata.

## Features

- **Video Download**: Uses yt-dlp to download videos from YouTube, Instagram, Twitter, Facebook, and TikTok
- **Cloud Storage**: Uploads videos to AWS S3 or Cloudflare R2
- **Metadata Extraction**: Extracts title, platform, thumbnail, duration, and other metadata
- **Database Storage**: Stores video metadata in PostgreSQL
- **Error Handling**: Retry logic with exponential backoff for failed downloads
- **REST API**: Clean REST endpoints for video management

## API Endpoints

### POST /video/save
Ingest a new video from a URL.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=example",
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "uuid",
    "title": "Video Title",
    "thumbnailUrl": "https://storage.example.com/thumb.jpg",
    "storageUrl": "https://storage.example.com/video.mp4"
  }
}
```

### GET /video/:id
Get video details by ID.

### GET /video/user/:userId
Get videos by user ID with pagination.

### DELETE /video/:id
Delete a video and clean up storage.

### GET /health
Health check endpoint.

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/shortbread

# AWS S3 or Cloudflare R2
STORAGE_PROVIDER=s3  # or 'r2'
S3_BUCKET_NAME=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Video Processing
MAX_VIDEO_SIZE_MB=100
ALLOWED_PLATFORMS=youtube,instagram,twitter,facebook,tiktok
```

## Installation

```bash
npm install
npm start
```

## Testing

```bash
npm test
```

## Database Setup

The application will automatically create the required tables on startup. Ensure PostgreSQL is running and the database exists.

## Supported Platforms

- YouTube
- Instagram
- Twitter/X
- Facebook
- TikTok

## Error Handling

The service includes comprehensive error handling:
- Input validation
- Platform support checking
- Download retry logic (3 attempts with exponential backoff)
- Storage upload retry logic
- Automatic cleanup on failures