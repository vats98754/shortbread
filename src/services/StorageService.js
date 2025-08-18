const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 's3';
    this.initializeProvider();
  }

  initializeProvider() {
    if (this.provider === 'r2') {
      // Configure for Cloudflare R2
      this.s3 = new AWS.S3({
        endpoint: process.env.R2_ENDPOINT,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        region: 'auto',
        signatureVersion: 'v4'
      });
      this.bucketName = process.env.R2_BUCKET_NAME;
    } else {
      // Configure for AWS S3
      this.s3 = new AWS.S3({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });
      this.bucketName = process.env.S3_BUCKET_NAME;
    }
  }

  // Upload file to storage
  async uploadFile(filePath, userId, originalName) {
    if (!this.bucketName) {
      throw new Error('Storage bucket not configured');
    }

    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileExtension = path.extname(originalName) || '.mp4';
      const fileName = `videos/${userId}/${uuidv4()}${fileExtension}`;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: this.getContentType(fileExtension),
        ACL: 'private' // Videos should be private by default
      };

      // Add metadata
      uploadParams.Metadata = {
        'uploaded-by': userId,
        'upload-timestamp': new Date().toISOString(),
        'original-name': originalName
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      return {
        url: result.Location,
        key: fileName,
        bucket: this.bucketName,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Generate a signed URL for private video access
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };

      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  // Delete file from storage
  async deleteFile(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Upload thumbnail (if available)
  async uploadThumbnail(thumbnailUrl, userId) {
    if (!thumbnailUrl) return null;

    try {
      // Download thumbnail from external URL
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
      }

      const thumbnailBuffer = await response.buffer();
      const fileName = `thumbnails/${userId}/${uuidv4()}.jpg`;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read' // Thumbnails can be public
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      return {
        url: result.Location,
        key: fileName
      };
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      // Don't throw error for thumbnail upload failure
      return null;
    }
  }

  // Get appropriate content type based on file extension
  getContentType(extension) {
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska'
    };

    return contentTypes[extension.toLowerCase()] || 'video/mp4';
  }

  // Check if storage is properly configured
  async healthCheck() {
    try {
      // Try to list objects in the bucket (with limit to avoid large responses)
      await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        MaxKeys: 1
      }).promise();
      
      return {
        status: 'healthy',
        provider: this.provider,
        bucket: this.bucketName
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.provider,
        error: error.message
      };
    }
  }
}

module.exports = StorageService;