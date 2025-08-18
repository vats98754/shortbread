const express = require('express');
const VideoIngestionService = require('../services/VideoIngestionService');
const { validateVideoSaveRequest, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();
const videoIngestionService = new VideoIngestionService();

// POST /video/save - Main endpoint for video ingestion
router.post('/save', validateVideoSaveRequest, async (req, res) => {
  try {
    const { url, userId } = req.body;
    
    console.log(`Processing video save request - URL: ${url}, User: ${userId}`);
    
    const result = await videoIngestionService.processVideo(url, userId);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Video processed successfully'
    });
    
  } catch (error) {
    console.error('Video save error:', error);
    
    // Return appropriate error status based on error type
    let statusCode = 500;
    if (error.message.includes('Invalid URL') || 
        error.message.includes('required') ||
        error.message.includes('not supported')) {
      statusCode = 400;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Failed to extract') ||
               error.message.includes('Failed to download')) {
      statusCode = 422; // Unprocessable Entity
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /video/:id - Get video details by ID
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    
    const video = await videoIngestionService.getVideo(id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        videoId: video.id,
        title: video.title,
        platform: video.platform,
        thumbnailUrl: video.thumbnail_url,
        storageUrl: video.storage_url,
        duration: video.duration,
        fileSize: video.file_size,
        status: video.status,
        createdAt: video.created_at,
        metadata: video.metadata
      }
    });
    
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /video/user/:userId - Get videos by user ID
router.get('/user/:userId', validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const videos = await videoIngestionService.getUserVideos(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    const formattedVideos = videos.map(video => ({
      videoId: video.id,
      title: video.title,
      platform: video.platform,
      thumbnailUrl: video.thumbnail_url,
      storageUrl: video.storage_url,
      duration: video.duration,
      fileSize: video.file_size,
      status: video.status,
      createdAt: video.created_at
    }));
    
    res.json({
      success: true,
      data: formattedVideos,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: videos.length
      }
    });
    
  } catch (error) {
    console.error('Get user videos error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /video/:id - Delete video
router.delete('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    
    await videoIngestionService.deleteVideo(id);
    
    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete video error:', error);
    
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;