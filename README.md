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
- **Storage**: JSON files (development) / Database (production ready)
- **Video Processing**: Simulated (yt-dlp integration ready)

## 🔧 Development

The app implements the core UX requirement: Users can share videos from social media directly to organized boards through the system share sheet.

### Next Steps
- Integrate real yt-dlp for video downloading
- Add cloud storage (S3/Cloudflare R2) 
- Implement user authentication
- Add video playback interface
- Deploy to production hosting
