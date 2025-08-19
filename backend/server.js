const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shortbread';

// Connect to MongoDB
async function connectDB() {
    try {
        // Add connection timeout for development
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            connectTimeoutMS: 5000
        });
        console.log('Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        // For development, continue without database
        if (process.env.NODE_ENV !== 'production') {
            console.log('Continuing without database in development mode');
            return false;
        } else {
            console.error('MongoDB connection required in production');
            process.exit(1);
        }
    }
}

// MongoDB Schemas
const boardSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    created: { type: Date, default: Date.now },
    videoCount: { type: Number, default: 0 }
});

const videoSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    url: { type: String, required: true },
    platform: { type: String, required: true },
    title: { type: String, required: true },
    thumbnail: { type: String },
    duration: { type: String },
    status: { type: String, default: 'processed' },
    downloadUrl: { type: String },
    boardId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});

// In-memory fallback storage for development
let memoryBoards = [];
let memoryVideos = [];
let useDatabase = false;

const Board = mongoose.model('Board', boardSchema);
const Video = mongoose.model('Video', videoSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads (using memory storage for Render compatibility)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

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
        let board;
        if (useDatabase) {
            board = await Board.findOne({ id: boardId });
        } else {
            board = memoryBoards.find(b => b.id === boardId);
        }
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }
        
        // Process the video
        const videoInfo = extractVideoInfo(url);
        const videoData = {
            id: uuidv4(),
            ...videoInfo,
            boardId,
            status: 'processed',
            downloadUrl: `/api/videos/${videoInfo.id}/download`,
            addedAt: new Date().toISOString()
        };
        
        if (useDatabase) {
            const newVideo = new Video(videoData);
            await newVideo.save();
            
            // Update board video count
            const videoCount = await Video.countDocuments({ boardId });
            board.videoCount = videoCount;
            await board.save();
            
            res.json(newVideo);
        } else {
            memoryVideos.push(videoData);
            
            // Update board video count
            board.videoCount = memoryVideos.filter(v => v.boardId === boardId).length;
            
            res.json(videoData);
        }
        
    } catch (error) {
        console.error('Error saving video:', error);
        res.status(500).json({ error: 'Failed to save video' });
    }
});

// Get boards
app.get('/api/boards', async (req, res) => {
    try {
        if (useDatabase) {
            const boards = await Board.find().sort({ created: -1 });
            res.json(boards);
        } else {
            res.json(memoryBoards);
        }
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});

// Create board
app.post('/api/boards', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Board name is required' });
        }
        
        const boardData = {
            id: uuidv4(),
            name,
            description: description || '',
            created: new Date().toISOString(),
            videoCount: 0
        };
        
        if (useDatabase) {
            const newBoard = new Board(boardData);
            await newBoard.save();
            res.json(newBoard);
        } else {
            memoryBoards.push(boardData);
            res.json(boardData);
        }
        
    } catch (error) {
        console.error('Error creating board:', error);
        res.status(500).json({ error: 'Failed to create board' });
    }
});

// Get videos for a board
app.get('/api/boards/:boardId/videos', async (req, res) => {
    try {
        const { boardId } = req.params;
        
        if (useDatabase) {
            const boardVideos = await Video.find({ boardId }).sort({ addedAt: -1 });
            res.json(boardVideos);
        } else {
            const boardVideos = memoryVideos.filter(v => v.boardId === boardId);
            res.json(boardVideos);
        }
    } catch (error) {
        console.error('Error fetching board videos:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: useDatabase ? 'MongoDB' : 'In-Memory',
        environment: process.env.NODE_ENV || 'development'
    });
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
    useDatabase = await connectDB();
    
    app.listen(PORT, () => {
        console.log(`Shortbread server running on port ${PORT}`);
        console.log(`Frontend: http://localhost:${PORT}`);
        console.log(`API: http://localhost:${PORT}/api`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Database: ${useDatabase ? 'MongoDB Connected' : 'In-Memory Fallback'}`);
        if (useDatabase) {
            console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
        }
    });
}

startServer().catch(console.error);