# Demo server on DigitalOcean (start, demo, stop)

This folder runs the SatyaDeva BuildTech demo on a throwaway DigitalOcean
droplet in Bengaluru (`blr1`). You start it with one click before a demo and
stop it with one click afterwards. While it is stopped, the only thing that
remains is a small storage volume holding your data.

```
Browser --443--> caddy (HTTPS) --> frontend (nginx + React) --> backend (FastAPI) --> postgres
                 \_________________ all Docker data on the opencon-data volume _______________/
```

## What it costs

| Item | Price | Typical month (60 hours of demos) |
|---|---|---|
| Droplet `s-2vcpu-4gb` (only while started) | about $0.036 an hour | about $2.15 |
| Volume `opencon-data`, 10 GB (always) | $0.10 per GB a month | $1.00 |
| Image builds, registry, HTTPS certificate | free | $0 |
| **Total** | | **about $3.15 (≈ ₹270)** |

Billing for the droplet stops the moment it is destroyed. A powered-off
droplet is still billed, which is why **stop** destroys it instead. If you forget
to stop, an hourly check destroys it after 8 hours (change this with the
`DEMO_MAX_HOURS` variable).

## What is kept between demos

Everything Docker stores lives on the `opencon-data` volume, which survives
when the droplet is destroyed:

- the PostgreSQL database (your projects, users, settings)
- uploaded files and generated data
- `.env` with the database password and login secret, generated on the server
  the first time and never stored in GitHub
- the HTTPS certificate cache
- `backups/`: a compressed database dump taken at every stop (the last 7 are kept)

Do not delete the `opencon-data` volume in the DigitalOcean control panel
unless you want to start again from an empty database.

## One-time setup

1. **API token:** in DigitalOcean, go to **API > Tokens > Generate New Token**,
   choose **Full Access** (or read and write) and no expiry or a long one, and
   copy it.
2. **SSH key for the workflows:** in Windows PowerShell run
   `ssh-keygen -t ed25519 -f $HOME\.ssh\opencon_do -N '""' -C opencon-deploy`.
   This creates `opencon_do` (private) and `opencon_do.pub` in `C:\Users\<you>\.ssh\`.
3. In GitHub, go to **Settings > Secrets and variables > Actions > New repository secret**:
   - `DO_TOKEN`: the API token.
   - `DO_SSH_KEY`: the full contents of the private file `opencon_do`
     (open it in Notepad and copy everything, including the BEGIN and END lines).
4. Merge the pull request (or run **Actions > Build demo images > Run workflow**)
   so the app images are built once. This takes 20–30 minutes the first time.

The workflow registers the SSH key with DigitalOcean and creates the volume
on its own the first time you start a demo.

## Before and after each demo

- **Start:** **Actions > Demo server > Run workflow**, choose `start`, then
  **Run workflow**. In about 5–8 minutes the run summary shows the address,
  for example `https://139-59-1-2.sslip.io`. The address changes every time,
  because each new droplet gets a new IP address (see "Your own domain" below).
- **Stop:** the same workflow with `stop`.
- **First start only:** open the address, click **Register**, and create your own
  account. On a fresh database the first person to register becomes the
  administrator. The sign-in page also offers one-click demo logins with
  example projects.

New code merged to `main` is built automatically, and a running demo is
updated to it straight away.

## Your own domain (optional, later)

With a domain such as `demo.satyadeva.in`, set the `DEMO_DOMAIN` variable. The
droplet's IP still changes on every start, so the domain's DNS A record must
be updated after each start. If the domain's DNS is hosted at DigitalOcean
(free), this step can be automated as well.

## Settings in `.env` on the volume

| Setting | Default | Meaning |
|---|---|---|
| `SEED_DEMO` | `true` | Example projects and demo logins |
| `OE_DEMO_READ_ONLY` | `false` | `true` lets visitors look but not change anything |
| `OE_REGISTRATION_MODE` | `admin-approve` | New sign-ups wait for an admin; `closed` turns sign-up off |

To change one while a demo is running, connect with
`ssh -i $HOME\.ssh\opencon_do root@<droplet-ip>`, edit `/opt/opencon/.env`, and run
`cd /opt/opencon && docker compose up -d`.

## Getting a backup onto your laptop

While a demo is running:

```powershell
scp -i $HOME\.ssh\opencon_do "root@<droplet-ip>:/opt/opencon/backups/*" .
```

## Troubleshooting

- **"Add the DO_TOKEN and DO_SSH_KEY secrets first":** one of the two secrets is missing.
- **Start fails pulling images:** the images have not been built yet. Run
  **Build demo images** once.
- **Health check times out:** the failed run prints the container logs.
  Running `start` again is safe and reuses the same droplet.
- **"Volume is still attached":** a stop finished moments ago. Wait a minute
  and start again.
