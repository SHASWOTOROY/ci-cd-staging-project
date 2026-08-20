# System Architecture

## Overview

OneNote is a three-tier application deployed as Docker containers with automated CI/CD from GitHub Actions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GITHUB (Source of Truth)                    │
│  ┌──────────────┐    push to main    ┌──────────────────────────┐   │
│  │  Repository  │ ─────────────────► │  GitHub Actions Workflow │   │
│  │  (code)      │                    │  (.github/workflows/)    │   │
│  └──────────────┘                    └────────────┬─────────────┘   │
│                                                   │                 │
│  ┌──────────────────────────────────────────────┐│                 │
│  │  GitHub Secrets (encrypted, never in code)   ││                 │
│  │  • SERVER_HOST, SERVER_USER, SERVER_PASSWORD ││                 │
│  │  • DB_NAME, DB_USER, DB_PASSWORD             ││                 │
│  │  • APP_PORT                                  ││                 │
│  └──────────────────────────────────────────────┘│                 │
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │ SSH + rsync
                                                   │ generates .env
                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    YOUR SERVER (VPS / Cloud VM)                     │
│                         /opt/onenote/                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Docker Compose (docker-compose.prod.yml)        │   │
│  │                                                              │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │   │
│  │  │   CLIENT    │   │   SERVER    │   │   PostgreSQL    │   │   │
│  │  │  (nginx)    │──►│  (Express)  │──►│   (database)    │   │   │
│  │  │  Port 80    │   │  Port 3001  │   │   Port 5432     │   │   │
│  │  │  React SPA  │   │  REST API   │   │   (internal)    │   │   │
│  │  └─────────────┘   └─────────────┘   └─────────────────┘   │   │
│  │        ▲                                    ▲                 │   │
│  │        │         onenote-net (bridge)       │                 │   │
│  │        └────────────────────────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│                              │ HTTP :80                             │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                          ┌────┴────┐
                          │  Users  │
                          │ Browser │
                          └─────────┘
```

## Component Details

### 1. Frontend (Client)

| Property | Value |
|----------|-------|
| Technology | React 19 + Vite |
| Served by | Nginx (Alpine) |
| Port | 80 (mapped to APP_PORT) |
| Build | Static files, built at Docker image creation |

**Responsibilities:**
- Single-page application (no page reloads)
- Note editor with auto-save (debounced 600ms)
- Sidebar navigation (notebooks, pinned, links)
- Search across notes
- Proxies `/api/*` requests to backend via Nginx

### 2. Backend (Server)

| Property | Value |
|----------|-------|
| Technology | Node.js 20 + Express |
| Port | 3001 (internal only) |
| Database driver | node-postgres (pg) |

**Responsibilities:**
- REST API for notes, notebooks, pinned links
- Database migrations on startup
- Health check endpoint (`/api/health`)
- CORS enabled for development

### 3. Database (PostgreSQL)

| Property | Value |
|----------|-------|
| Image | postgres:16-alpine |
| Port | 5432 (internal only, not exposed in prod) |
| Persistence | Docker volume `postgres_data` |

**Schema:**

```
notebooks          notes                pinned_links
─────────          ─────                ────────────
id (PK)            id (PK)              id (PK)
name               notebook_id (FK)     title
color              title                url
created_at         content              description
updated_at         is_pinned            icon
                   color                sort_order
                   tags[]               created_at
                   created_at
                   updated_at
```

### 4. CI/CD Pipeline

```
Push to main
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Job: test  │────►│ Job: deploy  │────►│  Server live    │
│  • npm ci   │     │ • gen .env   │     │  docker compose │
│  • build    │     │ • rsync code │     │  up -d          │
└─────────────┘     │ • ssh deploy │     └─────────────────┘
                    │ • verify     │
                    └──────────────┘
```

**Secrets flow:**
1. You store credentials in GitHub → Settings → Secrets
2. Workflow reads secrets at runtime (never logged)
3. Workflow generates `.env` file on the fly
4. `.env` is copied to server via SCP
5. Docker Compose reads `.env` for container config

## Network Architecture

```
Internet
    │
    ▼
[Port 80] ──► nginx (client container)
                  │
                  ├── /          → React static files
                  └── /api/*     → proxy to server:3001
                                        │
                                        ▼
                                   PostgreSQL (db container)
                                   (only reachable inside Docker network)
```

**Security notes:**
- Database is NOT exposed to the internet (no port mapping in prod)
- API is only reachable through Nginx reverse proxy
- All secrets live in GitHub Secrets, never in repository code
- `.env` is gitignored

## Data Flow: Creating a Note

```
User types in editor
        │
        ▼ (debounce 600ms)
  PUT /api/notes/:id
        │
        ▼
  Express validates & updates
        │
        ▼
  PostgreSQL UPDATE notes SET ...
        │
        ▼
  Response → UI updates "Saving..." indicator
```

## Environment Variables

| Variable | Where set | Used by |
|----------|-----------|---------|
| `DB_NAME` | GitHub Secret → `.env` | PostgreSQL, Server |
| `DB_USER` | GitHub Secret → `.env` | PostgreSQL, Server |
| `DB_PASSWORD` | GitHub Secret → `.env` | PostgreSQL, Server |
| `APP_PORT` | GitHub Secret → `.env` | Client (port mapping) |
| `SERVER_HOST` | GitHub Secret | CI/CD only (SSH) |
| `SERVER_USER` | GitHub Secret | CI/CD only (SSH) |
| `SERVER_PASSWORD` | GitHub Secret | CI/CD only (SSH) |

## Scaling Considerations (Future)

- Add Redis for session/cache
- Use managed PostgreSQL (RDS, Supabase) instead of container
- Add SSL/TLS with Let's Encrypt + Certbot
- Switch from password SSH to SSH key authentication
- Add staging environment (deploy on `develop` branch)
