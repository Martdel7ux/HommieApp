#!/usr/bin/env python3
"""
Apply Supabase migrations + seed to a hosted project WITHOUT the database
password, using the Management API SQL endpoint and a personal access token.

This is the fallback for when `supabase link` + `supabase db push` aren't set up
(they need the DB password). Once you've run `supabase link`, prefer the CLI.

Usage:
    SUPABASE_ACCESS_TOKEN=sbp_...  SUPABASE_PROJECT_REF=xxxxxxxx  \
        python3 scripts/db-apply.py [migrations|seed|verify]

- migrations : applies every supabase/migrations/*.sql not yet in the remote
               schema_migrations history, then records them
- seed       : runs supabase/seed.sql (idempotent-ish; safe to re-run)
- verify     : prints row counts for the seeded tables
"""
import glob
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
REF = os.environ["SUPABASE_PROJECT_REF"]
API = f"https://api.supabase.com/v1/projects/{REF}/database/query"
ROOT = pathlib.Path(__file__).resolve().parent.parent
MIGRATIONS = ROOT / "supabase" / "migrations"
SEED = ROOT / "supabase" / "seed.sql"


def query(sql: str, wrap: bool = True):
    body = f"begin;\n{sql}\ncommit;" if wrap else sql
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": body}).encode(),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",  # api.supabase.com blocks the urllib UA
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"  ✗ SQL error ({e.code}): {e.read().decode()[:800]}")


def remote_versions() -> set[str]:
    query(
        "create schema if not exists supabase_migrations;"
        "create table if not exists supabase_migrations.schema_migrations "
        "(version text primary key, statements text[], name text);"
    )
    rows = query("select version from supabase_migrations.schema_migrations;", wrap=False)
    return {r["version"] for r in rows}


def cmd_migrations():
    applied = remote_versions()
    files = sorted(glob.glob(str(MIGRATIONS / "*.sql")))
    pending = [f for f in files if pathlib.Path(f).name.split("_")[0] not in applied]
    if not pending:
        print("Up to date — no pending migrations.")
        return
    print(f"Applying {len(pending)} migration(s):")
    for f in pending:
        name = pathlib.Path(f).name
        version = name.split("_")[0]
        query(pathlib.Path(f).read_text())
        query(
            "insert into supabase_migrations.schema_migrations (version, statements, name) "
            f"values ('{version}', '{{}}'::text[], '{name}') on conflict (version) do nothing;",
            wrap=False,
        )
        print(f"  ✓ {name}")


def cmd_seed():
    query(SEED.read_text())
    print("  ✓ seed.sql applied")


def cmd_verify():
    checks = {
        "universities": "select count(*) from universities",
        "active listings": "select count(*) from accommodation_listings where status='active'",
        "published roommates": "select count(*) from roommate_preferences where is_published",
        "upcoming events": "select count(*) from events where starts_at > now()",
        "marketplace items": "select count(*) from marketplace_listings",
        "auth users": "select count(*) from auth.users",
    }
    for label, sql in checks.items():
        rows = query(sql, wrap=False)
        print(f"  {label:22} {rows[0]['count']}")


if __name__ == "__main__":
    {"migrations": cmd_migrations, "seed": cmd_seed, "verify": cmd_verify}[
        sys.argv[1] if len(sys.argv) > 1 else "migrations"
    ]()
