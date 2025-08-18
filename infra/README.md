# Infrastructure Configuration

This directory contains deployment and infrastructure configurations for the Shortbread application.

## Files

- `docker-compose.yml` - Development environment setup
- `docker-compose.prod.yml` - Production environment setup
- `ci-cd.yml` - GitHub Actions workflow (to be placed in `.github/workflows/`)

## Usage

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

## Environment Variables

### Frontend
- `REACT_APP_API_URL` - Backend API URL

### Backend
- `NODE_ENV` - Environment (development/production)

## Scaling

For production scaling, consider:
- Load balancer (nginx/traefik)
- Database (PostgreSQL)
- Redis for caching
- CDN for static assets