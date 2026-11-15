#!/usr/bin/env python3
"""Load the BEL Palasamudram demo set-up into a running OpenConstructionERP server.

Everything here is demo data built from the client's documents plus the
assumptions logged in the demo tracker (dummy users, sample progress, sample
RA bill). Nothing is sent anywhere except the server named by --url.

Usage:
    python load_bel_demo.py --url https://<server> --email <admin email> --password <admin password>

The admin account must already exist (the first account registered on a fresh
server becomes admin). Run it once; a second run stops if the project exists.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import sys

import httpx

HERE = pathlib.Path(__file__).resolve().parent
BOQ_FILE = HERE / "BEL-BOQ-import.xlsx"
SCHEDULE_FILE = HERE / "BEL-baseline-schedule-import.xlsx"
# The client's BOQ (with quoted rates) and programme are NOT stored in the
# repository in plain form: they live in bel-demo-data.tar.gz.enc, which the
# workflow decrypts with the BEL_DATA_KEY secret into --data.

PROJECT_CODE = "RT-750-00234"
DEMO_PASSWORD = ""  # read from <data>/config.json, never printed
TODAY = dt.date(2026, 11, 15)

USERS = [
    # key, full name, email, app role, project role
    ("pm", "Project Manager (JV)", "pm.bel@example.com", "manager", "project_manager"),
    ("planning", "Planning Engineer (JV)", "planning.bel@example.com", "editor", "member"),
    ("qs", "Billing Engineer / QS (JV)", "qs.bel@example.com", "editor", "estimator"),
    ("site", "Site Engineer (JV)", "site.bel@example.com", "editor", "member"),
    ("stores", "Store Keeper (JV)", "stores.bel@example.com", "editor", "member"),
    ("qa", "QA/QC Engineer (JV)", "qa.bel@example.com", "editor", "member"),
    ("safety", "Safety Officer (JV)", "safety.bel@example.com", "editor", "member"),
    ("rites", "RITES Engineer-in-Charge (view only)", "rites.bel@example.com", "viewer", "viewer"),
    ("bel", "BEL Representative (view only)", "bel.rep@example.com", "viewer", "viewer"),
]

WBS = [
    ("01", "PCB & Admin Building (G+1)"),
    ("02", "Production Building (G+1)"),
    ("03", "PCB Warehouse"),
    ("04", "Production Warehouse / FG Store"),
    ("05", "Utility Building"),
    ("06", "ISP/TSP Room"),
    ("07", "Covered Conveyor Bridge"),
    ("08", "External Works (roads, drainage, water, STP, landscape)"),
    ("09", "Electrical, HVAC, Fire and ELV services"),
]

START = dt.date(2026, 8, 20)  # assumed date of start (A2)
MILESTONES = [
    ("Date of start (LOA + 15 days, assumed)", START, None, "completed"),
    ("Milestone 1: 1/8 of contract value", dt.date(2027, 2, 20), "0.25", "in_progress"),
    ("Milestone 2: 3/8 of contract value", dt.date(2027, 5, 20), "0.5", "pending"),
    ("Milestone 3: 1/2 of contract value", dt.date(2027, 8, 20), "0.75", "pending"),
    ("Milestone 4: 3/4 of contract value", dt.date(2027, 11, 20), "1", "pending"),
    ("Contract completion (18 months)", dt.date(2028, 2, 19), None, "pending"),
]


class Api:
    def __init__(self, url: str) -> None:
        self.base = url.rstrip("/") + "/api/v1"
        self.client = httpx.Client(timeout=300, follow_redirects=True)
        self.token = ""

    def _h(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def call(self, method: str, path: str, ok_missing: bool = False, **kw):
        r = self.client.request(method, self.base + path, headers=self._h(), **kw)
        if r.status_code >= 400:
            if ok_missing:
                print(f"  ! skipped {method} {path} ({r.status_code}): {r.text[:300]}")
                return None
            raise SystemExit(f"{method} {path} failed ({r.status_code}): {r.text[:600]}")
        return r.json() if r.content else {}

    def login(self, email: str, password: str) -> None:
        r = self.client.post(self.base + "/users/auth/login/", json={"email": email, "password": password})
        if r.status_code >= 400:
            # A brand-new server has no accounts yet: the first account
            # registered becomes the admin, so create it and log in again.
            reg = self.client.post(self.base + "/users/auth/register/",
                                   json={"email": email, "password": password, "full_name": "Administrator"})
            if reg.status_code >= 400:
                raise SystemExit(f"Could not log in as {email} ({r.status_code}): {r.text[:300]}")
            step(f"Created the admin account {email} on this new server")
            r = self.client.post(self.base + "/users/auth/login/", json={"email": email, "password": password})
            if r.status_code >= 400:
                raise SystemExit(f"Log in failed after creating the admin ({r.status_code}): {r.text[:300]}")
        self.token = r.json()["access_token"]


def step(msg: str) -> None:
    print(f"- {msg}", flush=True)


def items(data):
    if isinstance(data, list):
        return data
    for key in ("items", "results", "data"):
        if isinstance(data, dict) and isinstance(data.get(key), list):
            return data[key]
    return []


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--data", default=str(HERE), help="folder holding the decrypted BOQ, schedule and config.json")
    args = ap.parse_args()

    global BOQ_FILE, SCHEDULE_FILE, DEMO_PASSWORD
    data = pathlib.Path(args.data)
    BOQ_FILE = data / "BEL-BOQ-import.xlsx"
    SCHEDULE_FILE = data / "BEL-baseline-schedule-import.xlsx"
    DEMO_PASSWORD = json.loads((data / "config.json").read_text())["demo_user_password"]

    api = Api(args.url)
    api.login(args.email, args.password)
    step("Logged in as admin")

    # Remove the built-in sample projects so only BEL shows in the demo (A14).
    purged = api.call("POST", "/projects/demo-data/purge/", ok_missing=True)
    if purged is not None:
        step("Removed the built-in sample projects")

    for p in items(api.call("GET", "/projects/", params={"limit": 200})):
        if p.get("project_code") == PROJECT_CODE:
            raise SystemExit(f"Project {PROJECT_CODE} already exists; nothing loaded. Delete it first to reload.")

    # 1. Organisations
    orgs = {}
    for key, ctype, name, notes in [
        ("bel", "client", "Bharat Electronics Limited (BEL)", "Employer. EM SBU, Palasamudram (AP)."),
        ("rites", "consultant", "RITES Ltd, Southern Region Project Office", "Agent / PMC and Engineer-in-Charge (PU Head, Bengaluru). 1st & 5th Floor, Industry House, 45 Race Course Road, Bengaluru 560001."),
        ("jv", "contractor", "SSC & SBWIPL (JV)", "Shri Satya Constructions & Santosh Buildwel Infra Pvt Ltd. Duo Marvel Layout, Yelahanka, Bengaluru 560064."),
        ("vinaxo", "consultant", "Vinaxo Structures Consulting Services", "PEB structural design consultant (steel quantities)."),
    ]:
        c = api.call("POST", "/contacts/", json={"contact_type": ctype, "company_name": name, "country_code": "IN", "notes": notes})
        orgs[key] = c["id"]
    step("Created organisations: BEL, RITES, JV, PEB designer")

    # 2. Project
    project = api.call("POST", "/projects/", json={
        "name": "BEL Palasamudram - Mass Manufacturing Facility (EM SBU)",
        "description": (
            "Construction of Mass Manufacturing Facility for EM SBU at BEL Palasamudram (AP). "
            "Employer: BEL. Agent/PMC: RITES Ltd. Contractor: SSC & SBWIPL (JV). "
            "LOA No. RITES/BLR/MMF-EM-SBU-BEL-Palasamudram/E-544/LOA/2026 dated 05 Aug 2026. "
            "Tender RITES/BEL/PalaMMF/OT/05/2026. 18 months, DLP 24 months, PG 5%, SD 5%."
        ),
        "project_code": PROJECT_CODE,
        "region": "IN",
        "country_code": "IN",
        "currency": "INR",
        "locale": "en",
        "client_id": orgs["bel"],
        "contract_value": "1632945079.91",
        "budget_estimate": "1699908900.03",
        "planned_start_date": START.isoformat(),
        "planned_end_date": "2028-02-19",
        "actual_start_date": START.isoformat(),
        "default_vat_rate": "18",
        "address": {"city": "Palasamudram", "region": "Andhra Pradesh", "country": "India"},
        "custom_fields": {
            "Tender ID": "2026_RITES_269554_1",
            "Profit centre": "RT-750",
            "Engineer-in-Charge": "PU Head, RITES Bengaluru",
            "Performance guarantee": "Rs 8,16,47,254",
            "Price escalation": "Clause 10CC (cement 10%, steel 15%, other materials 50%, labour 25%)",
        },
    })
    pid = project["id"]
    step(f"Created project {PROJECT_CODE}")

    # 3. Work breakdown
    wbs_ids = {}
    for i, (code, name) in enumerate(WBS):
        w = api.call("POST", f"/projects/{pid}/wbs/", json={"code": code, "name": name, "level": 1, "sort_order": i})
        wbs_ids[code] = w["id"]
    step(f"Created {len(WBS)} work packages (buildings and services)")

    # 4. Contract milestones
    for name, date, pct, status in MILESTONES:
        api.call("POST", f"/projects/{pid}/milestones/", json={
            "name": name, "milestone_type": "contractual", "planned_date": date.isoformat(),
            "actual_date": date.isoformat() if status == "completed" else None,
            "status": status, "linked_payment_pct": pct,
            "metadata": {"withheld_if_missed_pct_of_contract": pct} if pct else {},
        })
    step("Created contract milestones (6, 9, 12, 15 and 18 months)")

    # 5. Dummy users and project membership
    existing = {u["email"]: u["id"] for u in items(api.call("GET", "/users/", params={"limit": 500}))}
    uid = {}
    for key, name, email, role, prole in USERS:
        if email in existing:
            uid[key] = existing[email]
        else:
            u = api.call("POST", "/users/", json={"email": email, "password": DEMO_PASSWORD, "full_name": name, "role": role, "locale": "en"})
            uid[key] = u["id"]
        api.call("POST", f"/projects/{pid}/members/", json={"user_id": uid[key], "role": prole})
    step(f"Created {len(USERS)} dummy users and added them to the project")

    # 6. BOQ
    boq = api.call("POST", "/boq/boqs/", json={
        "project_id": pid, "name": "Agreement BOQ (Schedules 1-6)",
        "description": "Quoted rates as per agreement BOQ, tender RITES/BEL/PalaMMF/OT/05/2026. Rs 163,29,45,079.91 excl. GST.",
    })
    with BOQ_FILE.open("rb") as fh:
        res = api.call("POST", f"/boq/boqs/{boq['id']}/import/excel/",
                       files={"file": (BOQ_FILE.name, fh, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
    step(f"Imported BOQ: {res.get('imported', res.get('created', '?'))} rows")
    api.call("POST", f"/boq/boqs/{boq['id']}/markups/", json={
        "name": "GST 18% (works contract)", "category": "tax", "markup_type": "percentage",
        "percentage": "18", "apply_to": "cumulative",
    }, ok_missing=True)

    # India settings: INR, CPWD rule set, Indian price database. Applied after
    # the BOQ so the CPWD checks never block the agreement BOQ import.
    pack = api.call("POST", "/packs/apply", json={"slug": "india-cpwd", "confirm_disables": True, "install_demo": False}, ok_missing=True)
    if pack:
        step("Applied the India (CPWD) pack")

    # 7. Baseline schedule
    content = SCHEDULE_FILE.read_bytes()
    sha = hashlib.sha256(content).hexdigest()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    api.call("POST", "/schedule/schedule/import/spreadsheet/preview/",
             data={"project_id": pid}, files={"file": (SCHEDULE_FILE.name, content, mime)})
    sched = api.call("POST", "/schedule/schedule/import/spreadsheet/commit/",
                     data={"project_id": pid, "expected_sha256": sha, "target": "new",
                           "name": "Baseline programme (JV 15-month plan, contract milestones)", "date_order": "dmy"},
                     files={"file": (SCHEDULE_FILE.name, content, mime)})
    step(f"Imported baseline schedule ({sched.get('activities_created', sched.get('activity_count', 'ok'))} activities)")

    load_site_records(api, pid, uid, wbs_ids, orgs)
    print("\nDone. Demo users log in with the demo password shared privately (not shown here).")


def load_site_records(api: Api, pid: str, uid: dict, wbs_ids: dict, orgs: dict) -> None:
    """Sample records (marked SAMPLE) so the RITES/BEL screens are not empty."""
    tag = {"demo_sample": True}

    # Approvals: material makes, samples, design
    subs = [
        ("Approved makes: Cement (OPC 53 / PPC)", "product_data", "approved", "Civil", "UltraTech / ACC / Dalmia", "2026-08-28", "2026-09-05"),
        ("Approved makes: TMT reinforcement Fe500D", "product_data", "approved", "Civil", "SAIL / JSW / TATA Tiscon", "2026-08-28", "2026-09-05"),
        ("PEB structural design and drawings (IISc proof check)", "shop_drawing", "approved_as_noted", "Structural", "Vinaxo Structures", "2026-09-21", "2026-10-27"),
        ("Ready-mix concrete M25 mix design", "product_data", "approved", "Civil", "RMC supplier (to confirm)", "2026-10-05", "2026-10-15"),
        ("Approved makes: LT panels and cables", "product_data", "under_review", "Electrical", "To be proposed (3 makes)", "2026-11-05", None),
        ("Sample: vitrified floor tiles", "sample", "submitted", "Architectural", "Kajaria / Somany / Johnson", "2026-11-10", None),
        ("Approved makes: water-cooled chillers", "product_data", "revise_and_resubmit", "HVAC", "To be proposed (3 makes)", "2026-10-28", "2026-11-08"),
    ]
    for title, stype, status, disc, maker, sub_d, ret_d in subs:
        api.call("POST", "/submittals/", json={
            "project_id": pid, "title": title, "submittal_type": stype, "status": status,
            "discipline": disc, "manufacturer": maker, "submitted_by_org": "SSC & SBWIPL (JV)",
            "ball_in_court": "RITES" if status in ("submitted", "under_review") else "JV",
            "date_submitted": sub_d, "date_returned": ret_d, "review_period_days": 7,
            "metadata": tag,
        }, ok_missing=True)
    step(f"Created {len(subs)} sample approvals (makes, samples, PEB design)")

    # Quality: inspections and lab tests
    insp = [
        ("Footing reinforcement check, PCB & Admin grid A1-A6", "structural", "2026-11-12", "pass", "01"),
        ("Cube test 28-day, M25 footing concrete (lot 1)", "concrete", "2026-11-10", "pass", "01"),
        ("Cube test 7-day, M25 footing concrete (lot 2)", "concrete", "2026-11-14", "partial", "02"),
        ("Soil compaction test, backfill PCB & Admin", "general", "2026-11-08", "pass", "01"),
        ("Site safety inspection (weekly)", "general", "2026-11-13", "pass", None),
    ]
    insp_ids = []
    for title, itype, date, result, w in insp:
        i = api.call("POST", "/inspections/", json={
            "project_id": pid, "inspection_type": itype, "title": title, "inspection_date": date,
            "status": "completed", "result": result, "inspector_id": uid["qa"],
            "wbs_id": wbs_ids.get(w) if w else None, "location": "Palasamudram site", "metadata": tag,
        }, ok_missing=True)
        if i:
            insp_ids.append(i["id"])
    step(f"Created {len(insp_ids)} sample inspections and lab tests")

    ok = api.call("POST", "/ncr/", json={
        "project_id": pid, "title": "Honeycombing at stump column C4, Production Building",
        "description": "Minor honeycombing seen after de-shuttering. Raised during RITES joint inspection (SAMPLE).",
        "ncr_type": "workmanship", "severity": "minor", "status": "corrective_action",
        "corrective_action": "Chip loose concrete and repair with approved polymer mortar; RITES to re-inspect.",
        "location_description": "Production Building, grid C4", "metadata": tag,
    }, ok_missing=True)
    step("Created 1 sample non-conformance (NCR)" if ok else "NCR not created")

    # Site diaries for the last 7 days
    n = 0
    for back in range(7, 0, -1):
        day = TODAY - dt.timedelta(days=back)
        res = api.call("POST", "/daily-diary/diaries/", json={
            "project_id": pid, "diary_date": day.isoformat(), "site_supervisor_id": uid["site"],
            "weather_summary": {"condition": "Clear", "temp_min_c": 22, "temp_max_c": 31}, "labour_count": 140 + back * 3, "equipment_count": 9,
            "notes": ("SAMPLE. PCB & Admin: footing concrete and stump column reinforcement. "
                      "Production: footing excavation in hard rock (no blasting). PEB fabrication at vendor yard in progress."),
            "metadata": {**tag, "water_kl": 18, "diesel_l": 210, "power_kwh": 340},
        }, ok_missing=True)
        n += 1 if res else 0
    step(f"Created {n} sample daily site diaries")

    # Progress review meeting
    ok = api.call("POST", "/meetings/", json={
        "project_id": pid, "meeting_type": "progress", "title": "Monthly progress review with RITES/BEL (SAMPLE)",
        "meeting_date": "2026-11-07", "location": "Site office, Palasamudram",
        "agenda_items": [{"topic": "Progress against baseline and 4-week rolling programme"},
                         {"topic": "Pending approvals: LT panels, chillers"},
                         {"topic": "PEB fabrication status"}],
        "minutes": "SAMPLE minutes. RITES asked for revised 4-month rolling programme by 14 Nov.",
        "status": "completed", "metadata": tag,
    }, ok_missing=True)
    step("Created 1 sample progress review meeting" if ok else "Meeting not created")

    # RA bill 1 (sample)
    gross = 52500000
    ok = api.call("POST", "/finance/", json={
        "project_id": pid, "contact_id": orgs["bel"], "invoice_direction": "receivable",
        "invoice_number": "RA-01 (SAMPLE)", "invoice_date": "2026-11-05", "currency_code": "INR",
        "amount_subtotal": str(gross), "tax_amount": str(round(gross * 0.18)),
        "retention_amount": str(round(gross * 0.05)), "amount_total": str(round(gross * 1.18)),
        "status": "draft", "payment_terms_days": "30",
        "notes": "SAMPLE 1st running account bill. Security deposit 5% shown as retention. Figures are illustrative.",
        "line_items": [
            {"description": "Schedule 1: earthwork, PCC and RCC up to plinth (measured)", "quantity": "1", "unit_rate": "31500000", "amount": "31500000"},
            {"description": "Schedule 3: PEB design and fabrication (advance on supply)", "quantity": "1", "unit_rate": "21000000", "amount": "21000000"},
        ],
        "metadata": tag,
    }, ok_missing=True)
    step("Created sample RA Bill 1" if ok else "RA bill not created")


if __name__ == "__main__":
    try:
        main()
    except httpx.HTTPError as exc:
        sys.exit(f"Could not reach the server: {exc}")
