# Deployment Guide — Step by Step

This guide walks you through deploying OneNote from GitHub to your server using GitHub Secrets for all credentials.

---

## Prerequisites

- A GitHub account
- A Linux server (Ubuntu 22.04+ recommended) with:
  - Public IP address
  - SSH access (username + password)
  - At least 1 GB RAM, 10 GB disk
- Git installed on your PC

---

## What Must Be Installed on the Server (Host)

Only install these **on the server OS**. Everything else (Nginx, Node.js, PostgreSQL) runs **inside Docker containers** — you do NOT install them on the host.

### Required on server

| Package | Why | Install command |
|---------|-----|-----------------|
| **Docker Engine** | Runs all app containers | `curl -fsSL https://get.docker.com \| sh` |
| **Docker Compose plugin** | Starts/stops the stack | `sudo apt-get install -y docker-compose-plugin` |
| **curl** | Used by setup script | Usually pre-installed on Ubuntu |
| **OpenSSH Server** | GitHub Actions connects via SSH | Usually pre-installed (`openssh-server`) |

### Optional on server

| Package | Why |
|---------|-----|
| **ufw** (firewall) | Open ports 22, 80, 443 only |
| **git** | Only if you clone manually instead of CI/CD rsync |

### NOT installed on server (runs in Docker)

| Component | Where it runs |
|-----------|---------------|
| **Nginx** | Inside `client` container |
| **Node.js / Express** | Inside `server` container |
| **PostgreSQL** | Inside `db` container |
| **React app (built files)** | Inside `client` container |

### Installed by GitHub Actions (not on your server)

| Tool | Where | Why |
|------|-------|-----|
| **sshpass** | GitHub runner | SSH with password from secrets |
| **rsync** | GitHub runner | Copy code to server |

### Persistent data on server

PostgreSQL data is stored in a **Docker named volume** (`onenote_postgres_data`), not inside the container. Notes and DB data **survive** redeploys, `docker compose down`, and image rebuilds.

```bash
# Verify volume exists after first deploy
docker volume ls | grep onenote_postgres_data

# See where data is stored on disk
docker volume inspect onenote_postgres_data
```

> Do **not** run `docker compose down -v` in production — the `-v` flag deletes volumes and wipes your database.

---

## Part 1: Prepare Your Server (One-Time)

### Step 1.1 — Connect to your server

```bash
ssh your_username@YOUR_SERVER_IP
# Enter your password when prompted
```

### Step 1.2 — Run the setup script

On the server:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/server-setup.sh | bash
```

Or manually copy and run `scripts/server-setup.sh` from this project.

This installs Docker, Docker Compose, and creates `/opt/onenote`.

### Step 1.3 — Verify Docker works

```bash
docker --version
docker compose version
```

### Step 1.4 — Log out and back in (if Docker was just installed)

```bash
exit
ssh your_username@YOUR_SERVER_IP
docker ps   # should work without sudo
```

---

## Part 2: Push Code to GitHub

### Step 2.1 — Create a GitHub repository

1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `onenote` (or any name)
3. Set to **Private** (recommended)
4. Do NOT initialize with README (we already have one)
5. Click **Create repository**

### Step 2.2 — Push your code

On your PC, in the project folder:

```bash
cd v:\cicd

git init
git add .
git commit -m "Initial commit: OneNote app with CI/CD"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/onenote.git
git push -u origin main
```

Replace `YOUR_USERNAME/onenote` with your actual repo path.

---

## Part 3: Configure GitHub Secrets

This is where ALL credentials live. **Never put passwords in your code.**

### Step 3.1 — Open Secrets settings

1. Go to your repository on GitHub
2. Click **Settings** (top tab)
3. In the left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Step 3.2 — Add each secret

Add these secrets one by one. Click **New repository secret** for each:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SERVER_HOST` | Your server IP address | `203.0.113.45` |
| `SERVER_USER` | SSH username | `ubuntu` or `root` |
| `SERVER_PASSWORD` | SSH password | `your-ssh-password` |
| `DB_NAME` | PostgreSQL database name | `onenote` |
| `DB_USER` | PostgreSQL username | `onenote_user` |
| `DB_PASSWORD` | PostgreSQL password (make it strong!) | `Xk9#mP2$vL8@nQ4` |
| `APP_PORT` | Port the app listens on | `80` |

#### How to add a secret (example for SERVER_HOST):

1. Click **New repository secret**
2. Name: `SERVER_HOST`
3. Secret: paste your server IP (e.g. `203.0.113.45`)
4. Click **Add secret**

Repeat for all 7 secrets above.

### Step 3.3 — Verify all secrets are set

You should see 7 secrets listed:

```
APP_PORT
DB_NAME
DB_PASSWORD
DB_USER
SERVER_HOST
SERVER_PASSWORD
SERVER_USER
```

> **Important:** GitHub never shows secret values after you save them. If you make a mistake, delete and re-create the secret.

---

## Part 4: Trigger Deployment

### Option A — Automatic (recommended)

Every push to the `main` branch triggers deployment automatically.

```bash
git add .
git commit -m "Trigger deployment"
git push origin main
```

### Option B — Manual trigger

1. Go to your repo → **Actions** tab
2. Click **Deploy OneNote to Production** workflow
3. Click **Run workflow** → **Run workflow**

### Step 4.1 — Watch the deployment

1. Go to **Actions** tab in your GitHub repo
2. Click the running workflow
3. Watch the jobs:
   - **Test & Lint** — builds the client
   - **Deploy to Server** — copies files, builds Docker, starts containers

### Step 4.2 — Verify it's live

Open in browser:

```
http://YOUR_SERVER_IP
```

You should see the OneNote application.

Health check:

```bash
curl http://YOUR_SERVER_IP/api/health
# {"status":"ok","timestamp":"..."}
```

---

## Part 5: How Secrets Flow (Understanding)

```
YOU (GitHub Settings)
  │
  │  Store secrets encrypted
  ▼
GITHUB ACTIONS (on push to main)
  │
  │  1. Reads secrets: ${{ secrets.DB_PASSWORD }}
  │  2. Generates .env file:
  │     DB_NAME=onenote
  │     DB_USER=onenote_user
  │     DB_PASSWORD=Xk9#mP2$vL8@nQ4
  │     APP_PORT=80
  │
  │  3. SSH to server with SERVER_HOST/USER/PASSWORD
  │  4. Copies code + .env to /opt/onenote/
  │  5. Runs: docker compose -f docker-compose.prod.yml up -d
  ▼
SERVER (/opt/onenote/.env)
  │
  │  Docker Compose reads .env
  │  Passes DB_* vars to PostgreSQL and Server containers
  ▼
RUNNING APPLICATION
```

**Key points:**
- Secrets are NEVER in your git repository
- `.env` is generated fresh on every deploy
- `.env` is in `.gitignore` — it never gets committed
- GitHub encrypts secrets at rest and masks them in logs

---

## Part 6: Updating the App

After making code changes:

```bash
git add .
git commit -m "Your change description"
git push origin main
```

GitHub Actions automatically redeploys. No manual server steps needed.

---

## Part 7: Troubleshooting

### Deployment failed at SSH step

- Verify `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD` are correct
- Ensure SSH password auth is enabled on server:
  ```bash
  # On server, check /etc/ssh/sshd_config
  PasswordAuthentication yes
  ```
- Restart SSH: `sudo systemctl restart sshd`

### App not loading in browser

```bash
# SSH to server and check containers
ssh your_user@YOUR_SERVER_IP
cd /opt/onenote
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs
```

### Database connection error

```bash
# Check if db container is healthy
docker compose -f docker-compose.prod.yml logs db
docker compose -f docker-compose.prod.yml logs server
```

Verify `DB_NAME`, `DB_USER`, `DB_PASSWORD` secrets match in GitHub.

### Port already in use

Change `APP_PORT` secret to another port (e.g. `8080`), then redeploy.

---

## Part 8: Security Best Practices

1. **Use strong DB passwords** — generate with: `openssl rand -base64 24`
2. **Keep repo private** on GitHub
3. **Consider SSH keys** instead of password (optional upgrade):
   - Generate key: `ssh-keygen -t ed25519 -C "github-actions"`
   - Add public key to server: `~/.ssh/authorized_keys`
   - Add private key as GitHub secret: `SSH_PRIVATE_KEY`
   - Remove `SERVER_PASSWORD` secret when using keys
4. **Add HTTPS** later with Let's Encrypt + Nginx or Caddy
5. **Firewall**: only open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

---

## Quick Reference: All GitHub Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `SERVER_HOST` | Yes | Server IP address |
| `SERVER_USER` | Yes | SSH login username |
| `SERVER_PASSWORD` | Yes | SSH login password |
| `DB_NAME` | Yes | PostgreSQL database name |
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `APP_PORT` | Yes | External port (usually `80`) |
| `SSH_PRIVATE_KEY` | No | Alternative to password auth |

---

## Local Development vs Production

| | Local | Production |
|---|-------|------------|
| Config file | `.env` (copy from `.env.example`) | Generated by CI from GitHub Secrets |
| Compose file | `docker-compose.yml` | `docker-compose.prod.yml` |
| DB password | `postgres` (default) | Strong secret password |
| Port | `8080` | `80` (or your APP_PORT) |
| Trigger | `docker compose up` | Push to `main` branch |
