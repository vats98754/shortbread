# Shortbread - Video Board Organizer

Share short-form videos from several sources (IG, YT, X, FB) to your shortbread board. This can publicly and privately save your shorts in organized collections and do not need the original link to still exist (the mp4/raw video file is directly pulled).

## 🚀 Features

- 📱 **Progressive Web App (PWA)**: Install directly from browser, works like a native app
- 📤 **Web Share Target**: Appears in mobile share sheets for seamless video sharing
- 📂 **Board Organization**: Create custom boards for video collections
- 🎥 **Video Processing**: Automatic video fetching and storage (yt-dlp ready)
- 🔄 **Offline Support**: Works without internet connection
- 📱 **Mobile-First**: Optimized for mobile devices

## 📱 Installation & Usage

### Quick Start
```bash
cd backend
npm install
npm start
```

Then visit `http://localhost:3000` and install the PWA on your device.

### 🚀 Deploy to Render (Free)

1. **Set up free MongoDB database:**
   - Sign up for [MongoDB Atlas](https://cloud.mongodb.com) (forever free tier: 512MB)
   - Create a new cluster (choose the free M0 tier)
   - Create a database user and get your connection string
   - Whitelist all IPs (0.0.0.0/0) for Render deployment

2. **Deploy to Render:**
   - Fork this repository
   - Sign up for [Render](https://render.com) (free tier available)
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration
   - Set the `MONGODB_URI` environment variable in Render dashboard

3. **Environment Variables for Render:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shortbread
   NODE_ENV=production
   ```

The app will automatically deploy and be available on your Render URL. The free tier includes:
- ✅ 512MB RAM
- ✅ Automatic deploys on git push
- ✅ HTTPS certificate
- ✅ Custom domain support
- ⚠️ Sleeps after 15 minutes of inactivity (wakes up automatically on first request)

### Local Development
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB connection string (optional for local development)
npm install
npm start
```

### How to Use
1. Install the PWA on your mobile device from your browser
2. Share a video link from any social media app
3. Choose "Shortbread" from the share menu
4. Select or create a board to save the video
5. Access your organized video collection anytime

## 🎯 Supported Platforms

- YouTube
- Instagram  
- TikTok
- X (Twitter)
- Facebook
- And more...

## 🏗️ Architecture

- **Frontend**: Vanilla JavaScript PWA with Web Share Target API
- **Backend**: Node.js/Express API server  
- **Database**: MongoDB Atlas (free tier - 512MB storage)
- **Hosting**: Render.com (free tier with auto-sleep)
- **Storage**: Database-based persistence (no local files)
- **Video Processing**: Simulated (yt-dlp integration ready)

## 🔧 Development

The app implements the core UX requirement: Users can share videos from social media directly to organized boards through the system share sheet.

### Next Steps
- Integrate real yt-dlp for video downloading
- Add cloud storage (S3/Cloudflare R2) 
- Implement user authentication
- Add video playback interface
- Deploy to production hosting
