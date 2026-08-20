#!/bin/bash
# Run this ONCE on your server before first deployment
# Usage: curl -sSL <url> | bash   OR   bash scripts/server-setup.sh

set -e

echo "=== OneNote Server Setup ==="

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. You may need to log out and back in."
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  sudo apt-get install -y docker-compose-plugin
fi

# Create deploy directory
sudo mkdir -p /opt/onenote
sudo chown "$USER:$USER" /opt/onenote

# Open firewall port (if ufw is active)
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  echo "Firewall ports 80 and 443 opened."
fi

echo ""
echo "=== Setup Complete ==="
echo "Deploy path: /opt/onenote"
echo "Next: Push to GitHub main branch to trigger CI/CD"
echo "Or manually: cd /opt/onenote && docker compose -f docker-compose.prod.yml up -d"
