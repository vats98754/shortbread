class ShortbreadApp {
    constructor() {
        this.boards = [];
        this.deferredPrompt = null;
        this.init();
    }

    async init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        // Load boards from backend
        await this.loadBoards();

        // Check for shared content
        this.handleSharedContent();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Render boards
        this.renderBoards();
        
        // Check for install prompt
        this.setupInstallPrompt();
    }

    setupEventListeners() {
        // Board selection
        document.getElementById('boardSelect').addEventListener('change', (e) => {
            const saveBtn = document.getElementById('saveVideoBtn');
            saveBtn.disabled = !e.target.value;
        });

        // Save video
        document.getElementById('saveVideoBtn').addEventListener('click', () => {
            this.saveVideo();
        });

        // Cancel share
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideShareTarget();
        });

        // Create board buttons
        document.getElementById('createBoardBtn').addEventListener('click', () => {
            this.showCreateBoardModal();
        });

        document.getElementById('addBoardBtn').addEventListener('click', () => {
            this.showCreateBoardModal();
        });

        // Modal actions
        document.getElementById('confirmCreateBoard').addEventListener('click', () => {
            this.createBoard();
        });

        document.getElementById('cancelCreateBoard').addEventListener('click', () => {
            this.hideCreateBoardModal();
        });

        // Install prompt
        document.getElementById('installBtn').addEventListener('click', () => {
            this.installApp();
        });

        document.getElementById('dismissInstall').addEventListener('click', () => {
            this.dismissInstallPrompt();
        });

        // Board name input enter key
        document.getElementById('boardNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createBoard();
            }
        });
    }

    handleSharedContent() {
        // Check URL parameters for shared content
        const urlParams = new URLSearchParams(window.location.search);
        const sharedUrl = urlParams.get('url') || urlParams.get('text');
        
        if (sharedUrl) {
            this.showShareTarget(sharedUrl);
        } else {
            this.showDashboard();
        }
    }

    async showShareTarget(url) {
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('shareTarget').classList.remove('hidden');
        
        // Ensure boards are loaded before populating selector
        await this.loadBoards();
        
        // Populate board selector
        this.populateBoardSelector();
        
        // Fetch video details
        await this.fetchVideoDetails(url);
    }

    showDashboard() {
        document.getElementById('shareTarget').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
    }

    hideShareTarget() {
        this.showDashboard();
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    async fetchVideoDetails(url) {
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = '<div class="loading">Fetching video details...</div>';

        try {
            const response = await fetch('/api/video/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const videoInfo = await response.json();
                this.displayVideoPreview(videoInfo);
            } else {
                throw new Error('Failed to fetch video details');
            }
        } catch (error) {
            console.error('Error fetching video details:', error);
            preview.innerHTML = `
                <div class="video-info">
                    <div class="video-title">Video from: ${this.extractDomain(url)}</div>
                    <div class="video-platform">${url}</div>
                </div>
            `;
        }
    }

    displayVideoPreview(videoInfo) {
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = `
            <div class="video-info">
                <div class="video-title">${videoInfo.title || 'Unknown Title'}</div>
                <div class="video-platform">${videoInfo.platform || this.extractDomain(videoInfo.url)}</div>
            </div>
        `;
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'Unknown source';
        }
    }

    populateBoardSelector() {
        const select = document.getElementById('boardSelect');
        select.innerHTML = '<option value="">Choose a board...</option>';
        
        this.boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.name;
            select.appendChild(option);
        });
    }

    async saveVideo() {
        const boardId = document.getElementById('boardSelect').value;
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('url') || urlParams.get('text');

        if (!boardId || !videoUrl) {
            this.showToast('Please select a board and ensure the video URL is valid', 'error');
            return;
        }

        try {
            const response = await fetch('/api/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: videoUrl,
                    boardId: boardId
                })
            });

            if (response.ok) {
                // Find the board name for the toast message
                const selectedBoard = this.boards.find(board => board.id === boardId);
                const boardName = selectedBoard ? selectedBoard.name : 'Unknown Board';
                this.showToast(`Saved to ${boardName} ✅`, 'success');
                setTimeout(() => {
                    this.hideShareTarget();
                }, 1500);
            } else {
                throw new Error('Failed to save video');
            }
        } catch (error) {
            console.error('Error saving video:', error);
            this.showToast('Failed to save video. Please try again.', 'error');
        }
    }

    showCreateBoardModal() {
        document.getElementById('createBoardModal').classList.remove('hidden');
        document.getElementById('boardNameInput').focus();
    }

    hideCreateBoardModal() {
        document.getElementById('createBoardModal').classList.add('hidden');
        document.getElementById('boardNameInput').value = '';
        document.getElementById('boardDescInput').value = '';
    }

    async createBoard() {
        const name = document.getElementById('boardNameInput').value.trim();
        const description = document.getElementById('boardDescInput').value.trim();

        if (!name) {
            this.showToast('Please enter a board name', 'error');
            return;
        }

        try {
            const response = await fetch('/api/boards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description })
            });

            if (response.ok) {
                const newBoard = await response.json();
                this.boards.push(newBoard);
                this.renderBoards();
                this.populateBoardSelector();
                this.hideCreateBoardModal();
                this.showToast(`Board "${name}" created!`, 'success');
            } else {
                throw new Error('Failed to create board');
            }
        } catch (error) {
            console.error('Error creating board:', error);
            this.showToast('Failed to create board. Please try again.', 'error');
        }
    }

    renderBoards() {
        const boardsList = document.getElementById('boardsList');
        
        if (this.boards.length === 0) {
            boardsList.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 2rem;">
                    <p>No boards yet. Create your first board to start saving videos!</p>
                </div>
            `;
            return;
        }

        boardsList.innerHTML = this.boards.map(board => `
            <div class="board-card" onclick="app.openBoard('${board.id}')">
                <div class="board-name">${this.escapeHtml(board.name)}</div>
                ${board.description ? `<div class="board-description">${this.escapeHtml(board.description)}</div>` : ''}
                <div class="board-stats">${board.videoCount} videos</div>
            </div>
        `).join('');
    }

    openBoard(boardId) {
        // For now, just show a toast. In a full implementation, this would navigate to the board view
        const board = this.boards.find(b => b.id === boardId);
        this.showToast(`Opening ${board.name} board...`, 'success');
    }

    async loadBoards() {
        try {
            const response = await fetch('/api/boards');
            if (response.ok) {
                this.boards = await response.json();
            } else {
                this.boards = [];
            }
        } catch (error) {
            console.error('Error loading boards:', error);
            this.boards = [];
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show install prompt if not already installed
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                setTimeout(() => {
                    document.getElementById('installPrompt').classList.remove('hidden');
                }, 3000);
            }
        });
    }

    async installApp() {
        if (!this.deferredPrompt) {
            this.showToast('App installation not available', 'error');
            return;
        }

        const result = await this.deferredPrompt.prompt();
        console.log('Install prompt result:', result);
        
        this.deferredPrompt = null;
        this.dismissInstallPrompt();
    }

    dismissInstallPrompt() {
        document.getElementById('installPrompt').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ShortbreadApp();
});

// Handle share target form submission (for browsers that support it)
if (window.location.pathname === '/share') {
    window.addEventListener('DOMContentLoaded', () => {
        // This would handle the POST data from the share target
        // For now, we'll rely on URL parameters
    });
}