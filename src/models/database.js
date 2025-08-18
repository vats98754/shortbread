const { Pool } = require('pg');

let pool;

// Initialize database connection
function initializeDatabase() {
  if (pool) return pool;
  
  const config = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shortbread',
    user: process.env.DB_USER || 'username',
    password: process.env.DB_PASS || 'password',
  };

  pool = new Pool(config);
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client:', err);
  });

  return pool;
}

// Create tables if they don't exist
async function setupDatabase() {
  const db = initializeDatabase();
  
  try {
    // Create videos table
    await db.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        original_url TEXT NOT NULL,
        storage_url TEXT NOT NULL,
        thumbnail_url TEXT,
        duration INTEGER,
        file_size BIGINT,
        metadata JSONB,
        status VARCHAR(20) DEFAULT 'processing',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on user_id for faster queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)
    `);

    // Create index on status for monitoring
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)
    `);

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

// Get database instance
function getDatabase() {
  if (!pool) {
    initializeDatabase();
  }
  return pool;
}

module.exports = {
  setupDatabase,
  getDatabase,
  initializeDatabase
};