# Demo server on Oracle Cloud (Always Free)

This folder runs the SatyaDeva BuildTech demo on one free Oracle Cloud ARM server
(Ampere A1, Ubuntu). Every push to `main` builds fresh images on GitHub and
deploys them automatically, with free HTTPS from Let's Encrypt.

```
Browser --443--> caddy (HTTPS) --> frontend (nginx + React) --> backend (FastAPI) --> postgres
```

| File | What it does |
|---|---|
| `docker-compose.yml` | The four containers and their data volumes |
| `Caddyfile` | HTTPS certificate and reverse proxy |
| `bootstrap.sh` | Installs Docker, opens ports 80/443, creates `.env` with random secrets |
| `../../.github/workflows/deploy-demo.yml` | Builds ARM64 images and deploys over SSH |

## One-time setup

1. Create an Ampere A1 VM with a **Canonical Ubuntu** image (24.04 or 22.04,
   aarch64). Save the private SSH key Oracle generates.
2. In the VCN security list, add ingress rules for TCP 80 and TCP 443 from
   `0.0.0.0/0`. (The VM's own firewall is opened by `bootstrap.sh`.)
3. In GitHub, open **Settings > Secrets and variables > Actions** and add:
   - Variable `DEMO_HOST`: the VM's public IP address.
   - Variable `DEMO_DOMAIN` (optional): your domain, for example
     `demo.satyadeva.in`, once its DNS **A record** points at the VM's IP.
     Leave it unset to use the free `<ip-with-dashes>.sslip.io` address.
   - Secret `DEMO_SSH_KEY`: the full contents of the private key file,
     including the `-----BEGIN` and `-----END` lines.
4. Go to **Actions > Deploy demo > Run workflow**. The first run takes about
   20–30 minutes (later runs reuse a build cache). The run summary shows the
   live address.
5. Open the address, click **Register**, and create your own account. On a
   fresh database the first person to register becomes the administrator.
   The sign-in page also shows one-click demo logins with example projects.

Secrets for the database and logins are generated on the server and stay in
`~/opencon/.env` there. They are never stored in GitHub.

## Everyday commands

Connect from Windows PowerShell (OpenSSH is built in):

```powershell
ssh -i C:\path\to\ssh-key.key ubuntu@<VM-IP>
```

Then on the server:

```bash
cd ~/opencon
sudo docker compose ps                  # what is running
sudo docker compose logs -f backend     # live backend log (Ctrl+C to leave)
sudo docker compose restart backend     # restart one part
sudo docker compose stop                # stop the demo (data is kept)
sudo docker compose start               # start it again
```

**Redeploy:** push to `main`, or run **Deploy demo** from the Actions tab.
**Roll back:** run the workflow from an older commit, or edit `IMAGE_TAG` in
`~/opencon/.env` to an older commit id and run `sudo docker compose up -d`.

## Settings in `~/opencon/.env`

| Setting | Default | Meaning |
|---|---|---|
| `SEED_DEMO` | `true` | Example projects and demo logins |
| `OE_DEMO_READ_ONLY` | `false` | `true` lets visitors look but not change anything |
| `OE_REGISTRATION_MODE` | `admin-approve` | New sign-ups wait for an admin; `closed` turns sign-up off |
| `OE_BRAND_WEBSITE` | empty | Website shown in emails and PDFs |

After editing, apply with `sudo docker compose up -d`.

## Backups

```bash
cd ~/opencon
sudo docker compose exec -T postgres pg_dump -U oe openestimate | gzip > backup-$(date +%F).sql.gz
```

Copy the file to your laptop with
`scp -i C:\path\to\ssh-key.key ubuntu@<VM-IP>:~/opencon/backup-*.sql.gz .`

## Troubleshooting

- **Workflow skipped:** the `DEMO_HOST` variable is not set yet.
- **SSH step fails:** check `DEMO_HOST`, and that `DEMO_SSH_KEY` holds the
  whole private key file.
- **Health check times out:** ports 80/443 are probably not open in the
  Oracle security list, so Let's Encrypt cannot reach the server. The failed
  run prints the container logs.
- **Blank page after sign-in on a new domain:** the domain must match
  `DEMO_DOMAIN`; rerun the workflow after changing it.
- **Oracle stopped the VM as idle:** Always Free VMs with very low use can be
  reclaimed. Upgrading the account to Pay As You Go (still free within the
  Always Free limits) prevents this.
