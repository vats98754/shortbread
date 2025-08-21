const request = require('supertest');
const jwt = require('jsonwebtoken');

let app;

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    app = require('../server.js');
});

describe('Integration Tests - Full User Flow', () => {
    let userToken;
    let userId; 
    let boardId;
    
    describe('Complete Authentication and Board Flow', () => {
        it('should create user, authenticate, create board, and manage videos', async () => {
            // Step 1: Create user via magic link
            const magicResponse = await request(app)
                .post('/auth/magic-link')
                .send({
                    email: 'integration@example.com',
                    name: 'Integration User'
                });
            
            expect(magicResponse.status).toBe(200);
            expect(magicResponse.body.token).toBeDefined();
            
            // Step 2: Verify magic link to get access token
            const magicToken = magicResponse.body.token;
            const verifyResponse = await request(app)
                .get('/auth/verify')
                .query({ token: magicToken });
            
            expect(verifyResponse.status).toBe(302);
            expect(verifyResponse.headers.location).toMatch(/\?token=/);
            
            // Extract access token from redirect URL
            const redirectUrl = verifyResponse.headers.location;
            const tokenMatch = redirectUrl.match(/token=([^&]+)/);
            expect(tokenMatch).toBeTruthy();
            userToken = tokenMatch[1];
            
            // Step 3: Get user info
            const userResponse = await request(app)
                .get('/api/user')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(userResponse.status).toBe(200);
            expect(userResponse.body.email).toBe('integration@example.com');
            userId = userResponse.body.id;
            
            // Step 4: Create a board
            const boardResponse = await request(app)
                .post('/board/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    title: 'My Test Board',
                    isPublic: false
                });
            
            expect(boardResponse.status).toBe(200);
            expect(boardResponse.body.title).toBe('My Test Board');
            expect(boardResponse.body.userId).toBe(userId);
            expect(boardResponse.body.isPublic).toBe(false);
            boardId = boardResponse.body.id;
            
            // Step 5: Get boards list (should contain our board)
            const boardsListResponse = await request(app)
                .get('/api/boards')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(boardsListResponse.status).toBe(200);
            expect(Array.isArray(boardsListResponse.body)).toBe(true);
            expect(boardsListResponse.body.length).toBe(1);
            expect(boardsListResponse.body[0].id).toBe(boardId);
            
            // Step 6: Assign a video to the board
            const videoId = 'test-video-123';
            const assignResponse = await request(app)
                .patch(`/video/${videoId}/assign`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    boardIds: [boardId],
                    url: 'https://youtube.com/watch?v=test123'
                });
            
            expect(assignResponse.status).toBe(200);
            expect(assignResponse.body.video.platform).toBe('YouTube');
            
            // Step 7: Get videos for the board
            const boardVideosResponse = await request(app)
                .get(`/api/boards/${boardId}/videos`)
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(boardVideosResponse.status).toBe(200);
            expect(Array.isArray(boardVideosResponse.body)).toBe(true);
            expect(boardVideosResponse.body.length).toBe(1);
            
            // Step 8: Test public board access
            const publicBoardResponse = await request(app)
                .post('/board/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    title: 'Public Board',
                    isPublic: true
                });
            
            expect(publicBoardResponse.status).toBe(200);
            const publicBoardId = publicBoardResponse.body.id;
            
            // Should be accessible without authentication
            const publicAccessResponse = await request(app)
                .get(`/board/${publicBoardId}`);
            
            expect(publicAccessResponse.status).toBe(200);
            expect(publicAccessResponse.body.board.isPublic).toBe(true);
        });
        
        it('should enforce permissions correctly', async () => {
            // Create another user
            const user2MagicResponse = await request(app)
                .post('/auth/magic-link')
                .send({
                    email: 'user2@example.com',
                    name: 'User 2'
                });
            
            const user2MagicToken = user2MagicResponse.body.token;
            const user2VerifyResponse = await request(app)
                .get('/auth/verify')
                .query({ token: user2MagicToken });
            
            const user2RedirectUrl = user2VerifyResponse.headers.location;
            const user2TokenMatch = user2RedirectUrl.match(/token=([^&]+)/);
            const user2Token = user2TokenMatch[1];
            
            // User 2 should not be able to access user 1's private board
            const unauthorizedResponse = await request(app)
                .get(`/board/${boardId}`)
                .set('Authorization', `Bearer ${user2Token}`);
            
            expect(unauthorizedResponse.status).toBe(403);
            expect(unauthorizedResponse.body.error).toBe('Access denied. Board is private.');
            
            // User 2 should not be able to assign videos to user 1's board
            const unauthorizedAssignResponse = await request(app)
                .patch('/video/test-video-456/assign')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    boardIds: [boardId],
                    url: 'https://youtube.com/watch?v=test456'
                });
            
            expect(unauthorizedAssignResponse.status).toBe(403);
            expect(unauthorizedAssignResponse.body.error).toBe(`Access denied to board ${boardId}`);
        });
    });
});