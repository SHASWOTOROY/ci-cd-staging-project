# OneNote — Enterprise Single-Page Note Application

A full-stack, Dockerized note-taking application with CI/CD deployment from GitHub to your server.

## Features

- **Single-page React app** — notes, notebooks, pinned links, search
- **Auto-save** — notes save as you type
- **Pin notes** — quick access to important notes
- **Notebooks** — organize notes by category
- **Pinned links** — bookmark external resources
- **PostgreSQL** — persistent storage
- **Docker** — containerized for consistent deployments
- **GitHub Actions CI/CD** — push to `main` → auto-deploy to server

## Quick Start (Local)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start everything with Docker
docker compose up --build

# 3. Open the app
# http://localhost:8080
```

### Development without Docker

```bash
# Terminal 1 — PostgreSQL (or use Docker for db only)
docker compose up db

# Terminal 2 — Backend
cd server && npm install && npm run dev

# Terminal 3 — Frontend
cd client && npm install && npm run dev
# http://localhost:5173
```

## Project Structure

```
cicd/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx         # Main single-page application
│   │   ├── api.js          # API client
│   │   └── index.css       # Styles
│   ├── Dockerfile
│   └── nginx.conf          # Reverse proxy to API
├── server/                 # Express API
│   ├── src/
│   │   ├── index.js        # Entry point
│   │   ├── db.js           # PostgreSQL connection
│   │   ├── migrate.js      # Database migrations
│   │   └── routes/         # API routes
│   └── Dockerfile
├── .github/workflows/
│   └── deploy.yml          # CI/CD pipeline
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
├── scripts/
│   └── server-setup.sh     # One-time server setup
├── ARCHITECTURE.md         # System architecture
└── DEPLOYMENT.md           # Step-by-step deployment guide
```

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — system design and data flow
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — GitHub secrets setup and deployment steps

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/notes` | List notes (supports `?search=`, `?pinned=true`, `?notebook_id=`) |
| POST | `/api/notes` | Create note |
| PUT | `/api/notes/:id` | Update note |
| PATCH | `/api/notes/:id/pin` | Toggle pin |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/notebooks` | List notebooks |
| POST | `/api/notebooks` | Create notebook |
| GET | `/api/links` | List pinned links |
| POST | `/api/links` | Create link |

## License

MIT
