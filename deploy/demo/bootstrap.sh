#!/usr/bin/env bash
# Prepares a fresh Ubuntu droplet for the demo stack. Safe to re-run.
# Run as root on the droplet by deploy/demo/do-demo.sh (GitHub Actions):
#
#   VOLUME_NAME=opencon-data bash bootstrap.sh
#
# 1. Mounts the persistent block storage volume (formats it only if blank).
# 2. Points Docker's data directory at the volume BEFORE installing Docker, so
#    the database, uploads and certificates (Docker named volumes) live there
#    and survive the droplet being destroyed.
# 3. Installs Docker, adds a little swap, and creates .env with random secrets
#    on the volume the first time only.
#
# Afterwards /opt/opencon is the app folder (a link into the volume).
set -euo pipefail

VOLUME_NAME="${VOLUME_NAME:-opencon-data}"
DEV="/dev/disk/by-id/scsi-0DO_Volume_${VOLUME_NAME}"

# 1. Volume
for _ in $(seq 1 30); do [ -e "$DEV" ] && break; sleep 2; done
if [ ! -e "$DEV" ]; then
  echo "Block storage volume $VOLUME_NAME is not attached to this droplet." >&2
  exit 1
fi
if ! blkid "$DEV" >/dev/null 2>&1; then
  echo "Formatting new volume..."
  mkfs.ext4 -q "$DEV"
fi
MNT="$(findmnt -n -o TARGET -S "$DEV" | head -1 || true)"
if [ -z "$MNT" ]; then
  MNT=/mnt/opencon-data
  mkdir -p "$MNT"
  mount -o defaults,nofail,discard,noatime "$DEV" "$MNT"
fi
grep -q "$DEV" /etc/fstab || echo "$DEV $MNT ext4 defaults,nofail,discard,noatime 0 2" >> /etc/fstab
mkdir -p "$MNT/opencon/backups" "$MNT/docker"
ln -sfn "$MNT/opencon" /opt/opencon

# 2 + 3. Docker with its data on the volume
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<JSON
{ "data-root": "$MNT/docker", "log-driver": "local" }
JSON
if ! command -v docker >/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable docker >/dev/null 2>&1
systemctl restart docker

if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile
  mkswap /swapfile >/dev/null && swapon /swapfile
fi

cd /opt/opencon
if [ ! -f .env ]; then
  echo "Creating .env with fresh secrets (first run only)..."
  umask 077
  {
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
    echo "JWT_SECRET=$(openssl rand -hex 32)"
  } > .env
fi
chmod 600 .env
echo "Droplet ready. Persistent data at $MNT"
