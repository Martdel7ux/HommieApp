#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Link this repo to a hosted Supabase project and apply the schema + seed.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_...  \
#   SUPABASE_PROJECT_REF=abcdefgh  \
#   SUPABASE_DB_PASSWORD='your-db-password'  \
#   ./scripts/setup-remote-db.sh
#
# Get the access token at: https://supabase.com/dashboard/account/tokens
# Get the project ref + DB password from your project's dashboard.
# Nothing is written to disk except supabase/.temp (gitignored).
# ---------------------------------------------------------------------------
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
: "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF}"
: "${SUPABASE_DB_PASSWORD:?set SUPABASE_DB_PASSWORD}"

export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD

echo "→ Linking to project $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "→ Dry run (migrations that will be applied)"
supabase db push --linked --dry-run

echo "→ Applying migrations + seed"
supabase db push --linked --include-seed --yes

echo
echo "→ Project API keys:"
supabase projects api-keys --project-ref "$SUPABASE_PROJECT_REF" --reveal || true
echo
echo "Done. Put the Project URL + anon key into .env:"
echo "  EXPO_PUBLIC_SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co"
echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from above>"
