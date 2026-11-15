# BEL Palasamudram demo set-up

One click loads the whole BEL demo into the BEL server: the project, 9 dummy
users, the agreement BOQ (6 schedules, Rs 163.29 cr), the baseline programme
with contract milestones, India settings and sample site records (approvals,
lab tests, an NCR, site diaries, a progress meeting and a sample RA bill).
It takes about 2 minutes.

## Files

| File | What it is |
| --- | --- |
| `load_bel_demo.py` | The loader. Talks to the server's API only. |
| `bel-demo-data.tar.gz.enc` | The client's BOQ and programme files and the demo-user password, encrypted. This repository is public, so the client's quoted rates are never stored here in readable form. |

## One-time setup

In GitHub: Settings > Secrets and variables > Actions > New repository secret.

| Secret | Value |
| --- | --- |
| `BEL_ADMIN_EMAIL` | The admin login for the BEL server |
| `BEL_ADMIN_PASSWORD` | Its password (on a brand-new server the loader creates this account) |
| `BEL_DATA_KEY` | The key that unlocks `bel-demo-data.tar.gz.enc` (shared privately) |

`DO_TOKEN` is already there from the server set-up.

## Each time

1. Actions > "Start or stop a server" > Run workflow: server `bel`, action `start`.
2. Actions > "Load BEL demo data" > Run workflow.
3. Open the BEL server link from step 1 and log in.

Run the loader once per fresh database. If the project already exists it
stops without changing anything.

## Changing the data

To change the BOQ, programme or demo password: decrypt the bundle, edit,
then encrypt it again with the same key:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in bel-demo-data.tar.gz.enc -pass file:key.txt | tar xz
# edit BEL-BOQ-import.xlsx, BEL-baseline-schedule-import.xlsx or config.json
tar czf - BEL-BOQ-import.xlsx BEL-baseline-schedule-import.xlsx config.json \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -out bel-demo-data.tar.gz.enc -pass file:key.txt
```

All sample records are marked `SAMPLE` and carry `demo_sample: true` in
their metadata, so they are easy to find and remove before real use.
