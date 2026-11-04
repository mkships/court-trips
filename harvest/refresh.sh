#!/bin/bash
# Court Trips refresh: what harvest/install-mac.sh schedules every 3 days. Run it by hand any time.
#
#   1. harvest:fetch   fetch every source page and program page; free, no AI
#   2. /harvest        Claude Code reads only the pages that changed (uses your Claude plan)
#   3. harvest:import  safe changes go live, new programs become drafts, the rest waits in /admin;
#                      the summary is emailed (RESEND_API_KEY and SUBMISSIONS_NOTIFY_TO in web/.env.local)
#
# Everything is logged to harvest/.cache/logs/. Needs node, npm and claude on PATH, and web/.env.local
# with HARVEST_DATABASE_URL (production's, to update the live site) and BLOB_READ_WRITE_TOKEN (for photos).
set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$REPO/harvest/.cache/logs"
mkdir -p "$LOGS"
exec >>"$LOGS/$(date +%Y-%m-%d-%H%M).log" 2>&1
echo "== Court Trips refresh, $(date)"
cd "$REPO" || exit 1

if ! npm --prefix web run -s harvest:fetch; then
  echo "fetch failed; nothing imported"
  exit 1
fi

todo=$(node -e 'const r = require(process.argv[1]); console.log(r.pages.filter((p) => p.change !== "unchanged").length)' "$REPO/harvest/.cache/run.json")
if [ "$todo" -gt 0 ]; then
  echo "== $todo pages to read"
  # pre-approved: reading and writing files, web fetches, and the harvest npm scripts; nothing else
  claude -p "/harvest changed" \
    --permission-mode acceptEdits \
    --allowedTools "Read,Write,Edit,Glob,Grep,WebFetch,Bash(npm --prefix web run harvest:*)" \
    --max-turns 300 || echo "the Claude step stopped early; importing what it finished"
else
  echo "== nothing changed since the last run"
fi

npm --prefix web run -s harvest:import -- --email
echo "== done, $(date)"
