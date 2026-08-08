#!/usr/bin/env bash
# One-time server bootstrap (Ubuntu, e.g. Cafe24 dev-language VPS). Run as normal user with sudo.
# Idempotent: skips anything already installed by the host's auto-install package
# (Cafe24's auto-install already provides Node.js, PostgreSQL, Nginx, PM2).
set -euo pipefail

echo "==> apt update"
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

if ! command -v node >/dev/null; then
    echo "==> install Node 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "==> node already installed ($(node -v)) — see DEPLOYMENT.md if you need to pin 20 via nvm"
fi

if ! command -v pm2 >/dev/null; then
    echo "==> install pm2"
    sudo npm install -g pm2
fi

if ! command -v docker >/dev/null; then
    echo "==> install Docker (used for Postgres — skip if using the host's native PostgreSQL instead)"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "Log out and back in so docker group applies."
fi

if ! command -v certbot >/dev/null; then
    echo "==> install certbot (Nginx HTTPS)"
    sudo apt install -y certbot python3-certbot-nginx
fi

echo "==> bootstrap done. Next: clone repo, copy .env files, docker compose up, build:prod, pm2 start"
