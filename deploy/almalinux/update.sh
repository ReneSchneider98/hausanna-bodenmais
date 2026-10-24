#!/usr/bin/env bash
# =============================================================================
# Haus Anna – Update auf neue Version
#
#   bash /opt/hausanna/deploy/almalinux/update.sh          # neuester Stand von main
#   bash /opt/hausanna/deploy/almalinux/update.sh <commit> # bestimmter Stand (z. B. Rollback)
# =============================================================================
set -euo pipefail

APP_USER=hausanna
APP_DIR=/opt/hausanna
DATA_DIR=/var/lib/hausanna
DEPLOY_SRC=${APP_DIR}/deploy/almalinux
BRANCH="${BRANCH:-main}"
TARGET_REF="${1:-}"

log()  { echo -e "\n\033[1;32m==> $*\033[0m"; }
warn() { echo -e "\033[1;33m[WARNUNG]\033[0m $*"; }
die()  { echo -e "\033[1;31m[FEHLER]\033[0m $*" >&2; exit 1; }
as_app() { runuser -u "${APP_USER}" -- env HOME="${DATA_DIR}" PATH="/usr/local/bin:/usr/bin:/bin" "$@"; }

[[ $EUID -eq 0 ]] || die "Bitte als root ausführen."

PREV_COMMIT="$(as_app git -C "${APP_DIR}" rev-parse HEAD)"
rollback_hint() {
  echo
  warn "Update fehlgeschlagen. Zurück auf den vorherigen Stand:"
  echo "    bash ${DEPLOY_SRC}/update.sh ${PREV_COMMIT}"
  echo "    Logs: journalctl -u hausanna-api -n 100 --no-pager"
}
trap rollback_hint ERR

log "Code aktualisieren (vorher: ${PREV_COMMIT:0:8})"
as_app git -C "${APP_DIR}" fetch --prune origin
if [[ -n "${TARGET_REF}" ]]; then
  as_app git -C "${APP_DIR}" checkout --detach "${TARGET_REF}"
else
  as_app git -C "${APP_DIR}" checkout "${BRANCH}"
  as_app git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
fi
NEW_COMMIT="$(as_app git -C "${APP_DIR}" rev-parse HEAD)"
echo "    jetzt: ${NEW_COMMIT:0:8}"

log "Abhängigkeiten und Build"
PNPM_VERSION="$(sed -nE 's/.*"packageManager": *"pnpm@([^"]+)".*/\1/p' "${APP_DIR}/package.json")"
if [[ "$(pnpm -v 2>/dev/null || true)" != "${PNPM_VERSION}" ]]; then
  npm install -g "pnpm@${PNPM_VERSION}"
fi
as_app bash -c "cd '${APP_DIR}' && pnpm install --frozen-lockfile && NODE_OPTIONS=--max-old-space-size=1536 pnpm build"

log "Dienst-Dateien aktualisieren"
changed=false
for unit in hausanna-api.service hausanna-web.service hausanna-backup.service hausanna-backup.timer; do
  if ! cmp -s "${DEPLOY_SRC}/systemd/${unit}" "/etc/systemd/system/${unit}"; then
    install -m 644 "${DEPLOY_SRC}/systemd/${unit}" /etc/systemd/system/
    changed=true
  fi
done
install -m 755 "${DEPLOY_SRC}/backup.sh" /usr/local/sbin/hausanna-backup
$changed && systemctl daemon-reload

# SELinux-Kontext für neu gebautes Admin-Panel setzen
restorecon -R "${APP_DIR}/apps/admin/dist" || true

log "Dienste neu starten"
systemctl restart hausanna-api.service
systemctl restart hausanna-web.service

log "Health-Check"
ok=false
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1 \
     && curl -fsS -o /dev/null http://127.0.0.1:3001/; then
    ok=true; break
  fi
  sleep 2
done
if ! $ok; then
  rollback_hint
  exit 1
fi
curl -fsS http://127.0.0.1:3000/api/health; echo
trap - ERR
log "Update erfolgreich: ${PREV_COMMIT:0:8} -> ${NEW_COMMIT:0:8}"
