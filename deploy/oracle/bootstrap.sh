#!/usr/bin/env bash
# One-time (and safe to re-run) preparation of an Ubuntu ARM server for the
# demo stack. The deploy workflow runs it on every deploy, so a fresh Oracle
# VM needs nothing done by hand beyond adding the GitHub secrets.
#
#   DEMO_DOMAIN=demo.example.com bash bootstrap.sh
#
# It installs Docker, opens ports 80/443 in the VM's own firewall (Oracle's
# Ubuntu images block everything but SSH by default), adds a little swap, and
# creates .env with random database and login secrets the first time.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if ! command -v apt-get >/dev/null; then
  echo "This script expects Ubuntu. Re-create the VM with a Canonical Ubuntu image." >&2
  exit 1
fi

# 1. Docker
if ! command -v docker >/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi
sudo systemctl enable --now docker >/dev/null

# 2. Firewall inside the VM. Oracle's security list must also allow 80/443.
for port in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
done
sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null \
  || sudo iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
if command -v netfilter-persistent >/dev/null; then
  sudo netfilter-persistent save >/dev/null 2>&1 || true
fi

# 3. Swap, as a cushion if a smaller VM shape is used.
if ! swapon --show | grep -q .; then
  echo "Adding 4 GB swap..."
  sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# 4. Secrets, generated on the server and never leaving it.
if [ ! -f .env ]; then
  echo "Creating .env with fresh secrets..."
  umask 077
  {
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
    echo "JWT_SECRET=$(openssl rand -hex 32)"
  } > .env
fi
chmod 600 .env

if [ -n "${DEMO_DOMAIN:-}" ]; then
  if grep -q '^DEMO_DOMAIN=' .env; then
    sed -i "s|^DEMO_DOMAIN=.*|DEMO_DOMAIN=${DEMO_DOMAIN}|" .env
  else
    echo "DEMO_DOMAIN=${DEMO_DOMAIN}" >> .env
  fi
fi

echo "Server ready. Domain: $(grep '^DEMO_DOMAIN=' .env | cut -d= -f2-)"
