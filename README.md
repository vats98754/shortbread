# 🍞 Shortbread

Share short-form videos from several sources (IG, YT, X, FB) to your shortbread board. This can publicly and privately save your shorts in organized collections and do not need the original link to still exist (the mp4/raw video file is directly pulled).

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Infrastructure│
│                 │    │                 │    │                 │
│ React + Vite    │◄──►│ FastAPI         │◄──►│ Docker          │
│ Tailwind CSS    │    │ Python 3.12     │    │ GitHub Actions  │
│ PWA Support     │    │ /health API     │    │ CI/CD Pipeline  │
│ Port: 3000      │    │ Port: 8000      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shortbread
   ```

2. **Start Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```
   Backend runs at: http://localhost:8000

3. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs at: http://localhost:3000

### Docker Setup

```bash
cd infra
docker-compose up
```

## 📁 Project Structure

```
shortbread/
├── frontend/           # React + Tailwind + Vite/PWA
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── backend/            # FastAPI Python API
│   ├── main.py
│   ├── requirements.txt
│   ├── test_main.py
│   └── Dockerfile
├── infra/              # Deployment & Infrastructure
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── README.md
└── .github/
    └── workflows/
        └── ci-cd.yml   # GitHub Actions CI/CD
```

## 🔧 Development

### Frontend (React + Tailwind + PWA)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS 4
- **PWA**: Vite PWA plugin with service workers
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.12
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Health Check**: `GET /health`
- **Testing**: `pytest`
- **Lint**: `flake8`

### Infrastructure
- **Development**: Docker Compose
- **Production**: Docker Compose with production settings
- **CI/CD**: GitHub Actions for lint, test, build, and deploy

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Development
```bash
cd infra
docker-compose up
```

### Production
```bash
cd infra
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/`      | Root endpoint |
| GET    | `/health`| Health check |

## 🔮 Roadmap

- [ ] User authentication
- [ ] Video upload and processing
- [ ] Social media integrations (IG, YT, X, FB)
- [ ] Collections and boards
- [ ] Public/private sharing
- [ ] Search and filtering
- [ ] Mobile app (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
