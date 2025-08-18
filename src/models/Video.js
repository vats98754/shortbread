const { getDatabase } = require('./database');

class VideoModel {
  constructor() {
    this.db = getDatabase();
  }

  // Create a new video record
  async create(videoData) {
    const {
      userId,
      title,
      platform,
      originalUrl,
      storageUrl,
      thumbnailUrl,
      duration,
      fileSize,
      metadata
    } = videoData;

    const query = `
      INSERT INTO videos (
        user_id, title, platform, original_url, storage_url, 
        thumbnail_url, duration, file_size, metadata, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      userId,
      title,
      platform,
      originalUrl,
      storageUrl,
      thumbnailUrl,
      duration,
      fileSize,
      JSON.stringify(metadata),
      'completed'
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating video record:', error);
      throw error;
    }
  }

  // Update video status
  async updateStatus(videoId, status) {
    const query = `
      UPDATE videos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [status, videoId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating video status:', error);
      throw error;
    }
  }

  // Get video by ID
  async getById(videoId) {
    const query = 'SELECT * FROM videos WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [videoId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting video by ID:', error);
      throw error;
    }
  }

  // Get videos by user ID
  async getByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM videos 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await this.db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error getting videos by user ID:', error);
      throw error;
    }
  }

  // Delete video
  async delete(videoId) {
    const query = 'DELETE FROM videos WHERE id = $1 RETURNING *';
    
    try {
      const result = await this.db.query(query, [videoId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }
}

module.exports = VideoModel;