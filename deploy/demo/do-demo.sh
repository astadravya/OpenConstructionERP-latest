#!/usr/bin/env bash
# Start, stop and redeploy a throwaway server on DigitalOcean.
# Called by the server workflows, with doctl already signed in and the
# private SSH key at ~/.ssh/demo.
#
#   do-demo.sh up         create volume (first time) + droplet, deploy, health check
#   do-demo.sh redeploy   deploy new images only if the droplet is running
#   do-demo.sh down       back up the database to the volume, destroy the droplet
#   do-demo.sh autostop   run "down" on every server older than MAX_HOURS
#
# INSTANCE picks which server: "demo" (built from main) or a client name such
# as "bel" (built from the client/bel branch). Each instance has its own
# droplet, its own data volume and its own images, so client data never
# shares a database with the demo or with another client:
#
#   instance  droplet + tag   volume             images
#   demo      opencon-demo    opencon-data       ghcr.io/<owner>/opencon-*
#   bel       opencon-bel     opencon-bel-data   ghcr.io/<owner>/opencon-bel-*
set -euo pipefail

INSTANCE="${INSTANCE:-demo}"
case "$INSTANCE" in
  *[!a-z0-9-]*|"") echo "INSTANCE must be lower-case letters, digits or dashes" >&2; exit 2 ;;
esac
IMAGE_BASE="${IMAGE_BASE:?e.g. ghcr.io/owner/opencon}"
if [ "$INSTANCE" = demo ]; then
  NAME=opencon-demo; VOLUME_NAME=opencon-data; IMAGE_PREFIX="$IMAGE_BASE"
else
  NAME="opencon-$INSTANCE"; VOLUME_NAME="opencon-$INSTANCE-data"; IMAGE_PREFIX="$IMAGE_BASE-$INSTANCE"
fi
TAG="$NAME"
AUTOSTOP_TAG=opencon-autostop
REGION="${DO_REGION:-blr1}"
SIZE="${DO_SIZE:-s-2vcpu-4gb}"
VOLUME_SIZE="${VOLUME_SIZE_GB:-10}"
MAX_HOURS="${MAX_HOURS:-8}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
KEY="$HOME/.ssh/demo"
HERE="$(cd "$(dirname "$0")" && pwd)"

log() { echo "==> $*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$*" >> "$GITHUB_STEP_SUMMARY" || true; }

droplet_field() { # field name for the tagged droplet, empty if none
  doctl compute droplet list --tag-name "$TAG" --format "$1" --no-header | head -1 | tr -d ' '
}

ssh_run() {
  ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$HOME/.ssh/known_hosts" \
      -o ConnectTimeout=15 -o ServerAliveInterval=30 "root@$IP" "$@"
}

ensure_ssh_key() {
  ssh-keygen -y -f "$KEY" > "$KEY.pub"
  FP="$(ssh-keygen -E md5 -lf "$KEY.pub" | awk '{print $2}' | sed 's/^MD5://')"
  if ! doctl compute ssh-key get "$FP" >/dev/null 2>&1; then
    log "Registering the deploy SSH key with DigitalOcean"
    doctl compute ssh-key import opencon-deploy --public-key-file "$KEY.pub" >/dev/null
  fi
}

ensure_volume() {
  VOL_ID="$(doctl compute volume list --region "$REGION" --format ID,Name --no-header | awk -v n="$VOLUME_NAME" '$2==n{print $1}' | head -1)"
  if [ -z "$VOL_ID" ]; then
    log "Creating ${VOLUME_SIZE} GB storage volume $VOLUME_NAME in $REGION (first run only)"
    VOL_ID="$(doctl compute volume create "$VOLUME_NAME" --region "$REGION" --size "${VOLUME_SIZE}GiB" \
      --fs-type ext4 --desc "OpenCon $NAME data, kept between runs" --format ID --no-header)"
  fi
  # A droplet destroyed moments ago may still be detaching the volume.
  for _ in $(seq 1 30); do
    attached="$(doctl compute volume get "$VOL_ID" --format DropletIDs --no-header | tr -d '[] ')"
    [ -z "$attached" ] && return 0
    [ -n "${DROPLET_ID:-}" ] && [ "$attached" = "$DROPLET_ID" ] && return 0
    sleep 5
  done
  echo "Volume $VOLUME_NAME is still attached to droplet $attached." >&2
  exit 1
}

wait_for_ssh() {
  for _ in $(seq 1 40); do
    ssh_run true 2>/dev/null && return 0
    sleep 5
  done
  echo "Droplet $IP never answered on SSH." >&2
  exit 1
}

deploy() {
  DOMAIN="${DEMO_DOMAIN:-}"
  [ -z "$DOMAIN" ] && DOMAIN="$(echo "$IP" | tr . -).sslip.io"
  log "Preparing droplet $IP"
  ssh_run 'mkdir -p /root/stage'
  scp -i "$KEY" -o UserKnownHostsFile="$HOME/.ssh/known_hosts" -q \
    "$HERE/docker-compose.yml" "$HERE/Caddyfile" "$HERE/bootstrap.sh" "root@$IP:/root/stage/"
  ssh_run "VOLUME_NAME='$VOLUME_NAME' bash /root/stage/bootstrap.sh && cp /root/stage/docker-compose.yml /root/stage/Caddyfile /opt/opencon/"

  log "Pulling $IMAGE_TAG images and starting the app on https://$DOMAIN"
  echo "$GHCR_TOKEN" | ssh_run "docker login ghcr.io -u '$GHCR_USER' --password-stdin >/dev/null"
  ssh_run "cd /opt/opencon && sed -i '/^IMAGE_PREFIX=/d;/^IMAGE_TAG=/d;/^DEMO_DOMAIN=/d' .env \
    && printf 'IMAGE_PREFIX=%s\nIMAGE_TAG=%s\nDEMO_DOMAIN=%s\n' '$IMAGE_PREFIX' '$IMAGE_TAG' '$DOMAIN' >> .env \
    && docker compose pull -q && docker compose up -d --remove-orphans && docker image prune -f >/dev/null"
  ssh_run "docker logout ghcr.io >/dev/null" || true

  log "Waiting for the app and its HTTPS certificate"
  for i in $(seq 1 40); do
    if curl -fsS --max-time 10 "https://$DOMAIN/api/health" >/dev/null 2>&1; then
      log "Live at https://$DOMAIN"
      summary "### $NAME is live: https://$DOMAIN"
      summary "Remember to run **Start or stop a server > stop** when you finish. It also stops by itself after $MAX_HOURS hours."
      return 0
    fi
    echo "   still starting ($i/40)"; sleep 10
  done
  ssh_run "cd /opt/opencon && docker compose ps && docker compose logs --tail 80" || true
  echo "The app did not answer on https://$DOMAIN/api/health in time." >&2
  exit 1
}

cmd_up() {
  ensure_ssh_key
  DROPLET_ID="$(droplet_field ID)"
  if [ -z "$DROPLET_ID" ]; then
    ensure_volume
    log "Creating droplet $NAME ($SIZE) in $REGION"
    doctl compute droplet create "$NAME" --region "$REGION" --size "$SIZE" --image ubuntu-24-04-x64 \
      --ssh-keys "$FP" --volumes "$VOL_ID" --tag-names "$TAG,$AUTOSTOP_TAG" --wait >/dev/null
  else
    log "Droplet already running, redeploying onto it"
  fi
  IP="$(droplet_field PublicIPv4)"
  wait_for_ssh
  deploy
}

cmd_redeploy() {
  IP="$(droplet_field PublicIPv4)"
  if [ -z "$IP" ]; then
    log "No $NAME droplet running; new images will be used on its next start."
    return 0
  fi
  wait_for_ssh
  deploy
}

destroy_droplet() { # uses DROPLET_ID and IP
  if ssh_run true 2>/dev/null; then
    log "Backing up the database onto the volume and stopping the app cleanly"
    ssh_run 'set -e; cd /opt/opencon
      if docker compose ps --status running --services | grep -qx postgres; then
        docker compose exec -T postgres pg_dump -U oe openestimate | gzip > backups/db-$(date -u +%Y%m%d-%H%M).sql.gz
        ls -1t backups/db-*.sql.gz | tail -n +8 | xargs -r rm -f
      fi
      docker compose down
      sync' || log "Clean stop failed; destroying anyway (the database survives on the volume)."
  else
    log "Droplet not reachable over SSH; destroying anyway (data stays on the volume)."
  fi
  log "Destroying droplet $DROPLET_ID (its data volume is kept)"
  doctl compute droplet delete "$DROPLET_ID" --force
}

cmd_down() {
  DROPLET_ID="$(droplet_field ID)"
  if [ -z "$DROPLET_ID" ]; then
    log "No $NAME droplet running. Nothing to stop."
    return 0
  fi
  IP="$(droplet_field PublicIPv4)"
  destroy_droplet
  summary "### $NAME stopped. Billing for the server has ended; its data is kept on the $VOLUME_NAME volume."
}

cmd_autostop() { # every server, whatever its instance
  now="$(date -u +%s)"
  doctl compute droplet list --tag-name "$AUTOSTOP_TAG" -o json \
    | jq -r '.[] | [.id, .name, .created_at, ((.networks.v4 // [])[] | select(.type=="public") | .ip_address)] | @tsv' \
    | while IFS=$'\t' read -r DROPLET_ID dname created IP; do
        age_h=$(( (now - $(date -u -d "$created" +%s)) / 3600 ))
        log "$dname is $age_h hour(s) old (limit $MAX_HOURS)"
        if [ "$age_h" -ge "$MAX_HOURS" ]; then
          destroy_droplet </dev/null
          summary "### $dname was left running for $age_h hours and has been stopped."
        fi
      done
}

case "${1:-}" in
  up) cmd_up ;;
  redeploy) cmd_redeploy ;;
  down) cmd_down ;;
  autostop) cmd_autostop ;;
  *) echo "usage: $0 up|redeploy|down|autostop" >&2; exit 2 ;;
esac
