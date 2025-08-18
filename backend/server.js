const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// In-memory storage for development (in production, use a real database)
let boards = [];
let videos = [];

// Data persistence helpers
const DATA_DIR = path.join(__dirname, 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

async function loadData() {
    try {
        await ensureDataDir();
        
        try {
            const boardsData = await fs.readFile(BOARDS_FILE, 'utf8');
            boards = JSON.parse(boardsData);
        } catch {
            boards = [];
        }
        
        try {
            const videosData = await fs.readFile(VIDEOS_FILE, 'utf8');
            videos = JSON.parse(videosData);
        } catch {
            videos = [];
        }
        
        console.log(`Loaded ${boards.length} boards and ${videos.length} videos`);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function saveData() {
    try {
        await fs.writeFile(BOARDS_FILE, JSON.stringify(boards, null, 2));
        await fs.writeFile(VIDEOS_FILE, JSON.stringify(videos, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Video info extraction helper
function extractVideoInfo(url) {
    const urlObj = new URL(url);
    let platform = 'Unknown';
    
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        platform = 'YouTube';
    } else if (urlObj.hostname.includes('instagram.com')) {
        platform = 'Instagram';
    } else if (urlObj.hostname.includes('tiktok.com')) {
        platform = 'TikTok';
    } else if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
        platform = 'X (Twitter)';
    } else if (urlObj.hostname.includes('facebook.com')) {
        platform = 'Facebook';
    }
    
    return {
        url,
        platform,
        title: `Video from ${platform}`,
        thumbnail: null,
        duration: null
    };
}

// Simulate yt-dlp video processing
async function processVideo(url) {
    // In a real implementation, this would:
    // 1. Use yt-dlp to download the video
    // 2. Upload to S3/Cloudflare R2
    // 3. Extract metadata
    // 4. Generate thumbnails
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const videoInfo = extractVideoInfo(url);
            resolve({
                id: uuidv4(),
                ...videoInfo,
                status: 'processed',
                downloadUrl: `/api/videos/${videoInfo.id}/download`,
                addedAt: new Date().toISOString()
            });
        }, 2000); // Simulate processing time
    });
}

// Routes

// Handle PWA share target
app.post('/share', upload.single('file'), (req, res) => {
    const { title, text, url } = req.body;
    const sharedUrl = url || text;
    
    if (sharedUrl) {
        // Redirect to frontend with shared content
        res.redirect(`/?url=${encodeURIComponent(sharedUrl)}`);
    } else {
        res.redirect('/');
    }
});

// Get video information
app.post('/api/video/info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const videoInfo = extractVideoInfo(url);
        res.json(videoInfo);
        
    } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({ error: 'Failed to get video information' });
    }
});

// Save video to board
app.post('/api/videos', async (req, res) => {
    try {
        const { url, boardId } = req.body;
        
        if (!url || !boardId) {
            return res.status(400).json({ error: 'URL and boardId are required' });
        }
        
        // Find the board
        const board = boards.find(b => b.id === boardId);
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }
        
        // Process the video
        const processedVideo = await processVideo(url);
        processedVideo.boardId = boardId;
        
        videos.push(processedVideo);
        
        // Update board video count
        board.videoCount = videos.filter(v => v.boardId === boardId).length;
        
        await saveData();
        
        res.json(processedVideo);
        
    } catch (error) {
        console.error('Error saving video:', error);
        res.status(500).json({ error: 'Failed to save video' });
    }
});

// Get boards
app.get('/api/boards', (req, res) => {
    res.json(boards);
});

// Create board
app.post('/api/boards', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Board name is required' });
        }
        
        const newBoard = {
            id: uuidv4(),
            name,
            description: description || '',
            created: new Date().toISOString(),
            videoCount: 0
        };
        
        boards.push(newBoard);
        await saveData();
        
        res.json(newBoard);
        
    } catch (error) {
        console.error('Error creating board:', error);
        res.status(500).json({ error: 'Failed to create board' });
    }
});

// Get videos for a board
app.get('/api/boards/:boardId/videos', (req, res) => {
    const { boardId } = req.params;
    const boardVideos = videos.filter(v => v.boardId === boardId);
    res.json(boardVideos);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
    await loadData();
    
    app.listen(PORT, () => {
        console.log(`Shortbread server running on port ${PORT}`);
        console.log(`Frontend: http://localhost:${PORT}`);
        console.log(`API: http://localhost:${PORT}/api`);
    });
}

startServer().catch(console.error);