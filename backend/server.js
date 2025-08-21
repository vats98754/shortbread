const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@shortbread.app';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shortbread';

// MongoDB Schemas
const userSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const boardSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    userId: { type: String, required: true },
    title: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
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
    addedAt: { type: Date, default: Date.now }
});

const videoBoardSchema = new mongoose.Schema({
    videoId: { type: String, required: true },
    boardId: { type: String, required: true }
}, {
    indexes: [
        { videoId: 1, boardId: 1 }
    ]
});

// In-memory fallback storage for development
let memoryUsers = [];
let memoryBoards = [];
let memoryVideos = [];
let memoryVideoBoards = [];
let useDatabase = false;

const User = mongoose.model('User', userSchema);
const Board = mongoose.model('Board', boardSchema);
const Video = mongoose.model('Video', videoSchema);
const VideoBoard = mongoose.model('VideoBoard', videoBoardSchema);

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
        // For development and testing, continue without database
        if (process.env.NODE_ENV !== 'production') {
            console.log('Continuing without database in development/test mode');
            return false;
        } else {
            console.error('MongoDB connection required in production');
            process.exit(1);
        }
    }
}

// Initialize database connection for testing
if (process.env.NODE_ENV === 'test') {
    useDatabase = false; // Use in-memory storage for tests
} else {
    connectDB().then(connected => {
        useDatabase = connected;
    });
}

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

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let user;
        
        if (useDatabase) {
            user = await User.findOne({ id: decoded.userId });
        } else {
            user = memoryUsers.find(u => u.id === decoded.userId);
        }
        
        if (!user) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Generate magic link token
const generateMagicToken = (email) => {
    return jwt.sign({ email, type: 'magic' }, JWT_SECRET, { expiresIn: '15m' });
};

// Generate access token
const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Send magic link email (mock implementation)
const sendMagicLink = async (email, token, req) => {
    // In production, you'd configure nodemailer with real SMTP settings
    const magicLink = `${req.protocol}://${req.get('host')}/auth/verify?token=${token}`;
    console.log(`Magic link for ${email}: ${magicLink}`);
    // For development, just log the link
    return true;
};

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

// Authentication routes

// Request magic link
app.post('/auth/magic-link', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Check if user exists
        let user;
        if (useDatabase) {
            user = await User.findOne({ email });
            if (!user && name) {
                // Create new user
                const userData = {
                    id: uuidv4(),
                    email,
                    name,
                    createdAt: new Date()
                };
                user = new User(userData);
                await user.save();
            }
        } else {
            user = memoryUsers.find(u => u.email === email);
            if (!user && name) {
                // Create new user
                const userData = {
                    id: uuidv4(),
                    email,
                    name,
                    createdAt: new Date()
                };
                memoryUsers.push(userData);
                user = userData;
            }
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please provide a name to register.' });
        }
        
        // Generate magic token
        const magicToken = generateMagicToken(email);
        
        // Send magic link (in production, this would send an actual email)
        await sendMagicLink(email, magicToken, req);
        
        res.json({ 
            message: 'Magic link sent to your email',
            // For development and testing, include the token
            ...(process.env.NODE_ENV !== 'production' && { token: magicToken })
        });
        
    } catch (error) {
        console.error('Error sending magic link:', error);
        res.status(500).json({ error: 'Failed to send magic link' });
    }
});

// Verify magic link
app.get('/auth/verify', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        // Verify magic token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.type !== 'magic') {
            return res.status(400).json({ error: 'Invalid token type' });
        }
        
        // Find user
        let user;
        if (useDatabase) {
            user = await User.findOne({ email: decoded.email });
        } else {
            user = memoryUsers.find(u => u.email === decoded.email);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Generate access token
        const accessToken = generateAccessToken(user.id);
        
        // Redirect to frontend with token
        res.redirect(`/?token=${accessToken}`);
        
    } catch (error) {
        console.error('Error verifying magic link:', error);
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});

// Get current user
app.get('/api/user', authenticateToken, (req, res) => {
    res.json(req.user);
});

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

// Create board
app.post('/board/create', authenticateToken, async (req, res) => {
    try {
        const { title, isPublic } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Board title is required' });
        }
        
        const boardData = {
            id: uuidv4(),
            userId: req.user.id,
            title,
            isPublic: isPublic || false,
            createdAt: new Date()
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

// Get videos on a board
app.get('/board/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the board
        let board;
        if (useDatabase) {
            board = await Board.findOne({ id });
        } else {
            board = memoryBoards.find(b => b.id === id);
        }
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }
        
        // Check if board is public or user owns it
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let isOwner = false;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                let user;
                
                if (useDatabase) {
                    user = await User.findOne({ id: decoded.userId });
                } else {
                    user = memoryUsers.find(u => u.id === decoded.userId);
                }
                
                if (user && user.id === board.userId) {
                    isOwner = true;
                }
            } catch (error) {
                // Invalid token, continue as anonymous
            }
        }
        
        if (!board.isPublic && !isOwner) {
            return res.status(403).json({ error: 'Access denied. Board is private.' });
        }
        
        // Get videos for this board
        let videos = [];
        if (useDatabase) {
            const videoBoards = await VideoBoard.find({ boardId: id });
            const videoIds = videoBoards.map(vb => vb.videoId);
            videos = await Video.find({ id: { $in: videoIds } }).sort({ addedAt: -1 });
        } else {
            const videoBoards = memoryVideoBoards.filter(vb => vb.boardId === id);
            const videoIds = videoBoards.map(vb => vb.videoId);
            videos = memoryVideos.filter(v => videoIds.includes(v.id));
            videos.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        }
        
        res.json({
            board,
            videos,
            isOwner
        });
        
    } catch (error) {
        console.error('Error fetching board:', error);
        res.status(500).json({ error: 'Failed to fetch board' });
    }
});

// Assign video to board(s)
app.patch('/video/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { boardIds, url } = req.body;
        
        if (!boardIds || !Array.isArray(boardIds)) {
            return res.status(400).json({ error: 'boardIds array is required' });
        }
        
        // Create video if it doesn't exist
        let video;
        if (useDatabase) {
            video = await Video.findOne({ id });
        } else {
            video = memoryVideos.find(v => v.id === id);
        }
        
        if (!video && url) {
            // Create new video
            const videoInfo = extractVideoInfo(url);
            const videoData = {
                id,
                ...videoInfo,
                status: 'processed',
                downloadUrl: `/api/videos/${id}/download`,
                addedAt: new Date()
            };
            
            if (useDatabase) {
                video = new Video(videoData);
                await video.save();
            } else {
                memoryVideos.push(videoData);
                video = videoData;
            }
        } else if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Verify user owns all the boards
        for (const boardId of boardIds) {
            let board;
            if (useDatabase) {
                board = await Board.findOne({ id: boardId });
            } else {
                board = memoryBoards.find(b => b.id === boardId);
            }
            
            if (!board) {
                return res.status(404).json({ error: `Board ${boardId} not found` });
            }
            
            if (board.userId !== req.user.id) {
                return res.status(403).json({ error: `Access denied to board ${boardId}` });
            }
        }
        
        // Remove existing board assignments for this video
        if (useDatabase) {
            await VideoBoard.deleteMany({ videoId: id });
        } else {
            memoryVideoBoards = memoryVideoBoards.filter(vb => vb.videoId !== id);
        }
        
        // Add new board assignments
        for (const boardId of boardIds) {
            const videoBoardData = {
                videoId: id,
                boardId
            };
            
            if (useDatabase) {
                const videoBoard = new VideoBoard(videoBoardData);
                await videoBoard.save();
            } else {
                memoryVideoBoards.push(videoBoardData);
            }
        }
        
        res.json({ 
            message: 'Video assigned to boards successfully',
            video,
            boardIds
        });
        
    } catch (error) {
        console.error('Error assigning video to boards:', error);
        res.status(500).json({ error: 'Failed to assign video to boards' });
    }
});

// Legacy endpoints for backward compatibility

// Get boards (now requires authentication)
app.get('/api/boards', authenticateToken, async (req, res) => {
    try {
        if (useDatabase) {
            const boards = await Board.find({ userId: req.user.id }).sort({ createdAt: -1 });
            res.json(boards);
        } else {
            const userBoards = memoryBoards.filter(b => b.userId === req.user.id);
            res.json(userBoards);
        }
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});

// Create board (legacy)
app.post('/api/boards', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Board name is required' });
        }
        
        const boardData = {
            id: uuidv4(),
            userId: req.user.id,
            title: name, // Map legacy 'name' to 'title'
            isPublic: false,
            createdAt: new Date()
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

// Save video to board (legacy)
app.post('/api/videos', authenticateToken, async (req, res) => {
    try {
        const { url, boardId } = req.body;
        
        if (!url || !boardId) {
            return res.status(400).json({ error: 'URL and boardId are required' });
        }
        
        // Find the board and verify ownership
        let board;
        if (useDatabase) {
            board = await Board.findOne({ id: boardId });
        } else {
            board = memoryBoards.find(b => b.id === boardId);
        }
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }
        
        if (board.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to board' });
        }
        
        // Process the video
        const videoInfo = extractVideoInfo(url);
        const videoData = {
            id: uuidv4(),
            ...videoInfo,
            status: 'processed',
            downloadUrl: `/api/videos/${videoInfo.id}/download`,
            addedAt: new Date()
        };
        
        if (useDatabase) {
            const newVideo = new Video(videoData);
            await newVideo.save();
            
            // Create video-board relationship
            const videoBoard = new VideoBoard({
                videoId: videoData.id,
                boardId
            });
            await videoBoard.save();
            
            res.json(newVideo);
        } else {
            memoryVideos.push(videoData);
            memoryVideoBoards.push({
                videoId: videoData.id,
                boardId
            });
            res.json(videoData);
        }
        
    } catch (error) {
        console.error('Error saving video:', error);
        res.status(500).json({ error: 'Failed to save video' });
    }
});

// Get videos for a board (legacy)
app.get('/api/boards/:boardId/videos', authenticateToken, async (req, res) => {
    try {
        const { boardId } = req.params;
        
        // Find the board and verify ownership
        let board;
        if (useDatabase) {
            board = await Board.findOne({ id: boardId });
        } else {
            board = memoryBoards.find(b => b.id === boardId);
        }
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }
        
        if (board.userId !== req.user.id && !board.isPublic) {
            return res.status(403).json({ error: 'Access denied to board' });
        }
        
        // Get videos for this board
        let videos = [];
        if (useDatabase) {
            const videoBoards = await VideoBoard.find({ boardId });
            const videoIds = videoBoards.map(vb => vb.videoId);
            videos = await Video.find({ id: { $in: videoIds } }).sort({ addedAt: -1 });
        } else {
            const videoBoards = memoryVideoBoards.filter(vb => vb.boardId === boardId);
            const videoIds = videoBoards.map(vb => vb.videoId);
            videos = memoryVideos.filter(v => videoIds.includes(v.id));
            videos.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        }
        
        res.json(videos);
        
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
        environment: process.env.NODE_ENV || 'development',
        features: {
            authentication: true,
            userBoards: true,
            videoBoards: true,
            permissions: true
        }
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
    
    const server = app.listen(PORT, () => {
        console.log(`Shortbread server running on port ${PORT}`);
        console.log(`Frontend: http://localhost:${PORT}`);
        console.log(`API: http://localhost:${PORT}/api`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Database: ${useDatabase ? 'MongoDB Connected' : 'In-Memory Fallback'}`);
        if (useDatabase) {
            console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
        }
    });
    
    return server;
}

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
    startServer().catch(console.error);
}

// Export the app for testing
module.exports = app;