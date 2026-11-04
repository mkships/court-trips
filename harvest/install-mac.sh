#!/bin/bash
# Schedules harvest/refresh.sh on this Mac, about every 3 days, as a launchd job for your user.
# A run missed while the Mac was asleep or off happens when it next wakes.
#
#   bash harvest/install-mac.sh             install (or update) the schedule
#   bash harvest/install-mac.sh uninstall   remove it
#   launchctl kickstart gui/$(id -u)/com.courttrips.refresh    run it now
set -euo pipefail
LABEL="com.courttrips.refresh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

if [ "${1:-}" = "uninstall" ]; then
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed the Court Trips refresh schedule."
  exit 0
fi

REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node || true)"
CLAUDE="$(command -v claude || true)"
[ -n "$NODE" ] || { echo "node isn't on your PATH. Install Node.js 20+ first."; exit 1; }
[ -n "$CLAUDE" ] || { echo "claude isn't on your PATH. Install Claude Code and sign in (run claude once) first."; exit 1; }
[ -f "$REPO/web/.env.local" ] || { echo "web/.env.local is missing; the refresh needs HARVEST_DATABASE_URL there."; exit 1; }
case "$REPO" in
  "$HOME/Documents"*|"$HOME/Desktop"*|"$HOME/Downloads"*)
    echo "Note: macOS stops scheduled jobs reading Documents, Desktop and Downloads unless /bin/bash has Full Disk"
    echo "Access (System Settings > Privacy & Security). A folder like ~/code/court-trips avoids that." ;;
esac

# launchd can't say "every 3 days", so it runs on days 1, 4, 7 … 28 of each month at 07:17
DAYS=""
for d in 1 4 7 10 13 16 19 22 25 28; do
  DAYS="$DAYS<dict><key>Day</key><integer>$d</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>17</integer></dict>"
done

mkdir -p "$HOME/Library/LaunchAgents" "$REPO/harvest/.cache/logs"
cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/harvest/refresh.sh</string></array>
  <key>StartCalendarInterval</key><array>$DAYS</array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(dirname "$NODE"):$(dirname "$CLAUDE"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>StandardOutPath</key><string>$REPO/harvest/.cache/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$REPO/harvest/.cache/logs/launchd.log</string>
</dict>
</plist>
PLIST

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "Installed: the refresh runs on days 1, 4, 7 … 28 of each month at 07:17."
echo "Run it now:  launchctl kickstart $DOMAIN/$LABEL"
echo "Logs:        $REPO/harvest/.cache/logs/"
