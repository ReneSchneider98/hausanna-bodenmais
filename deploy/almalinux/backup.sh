#!/usr/bin/env bash
# Haus Anna – Backup (PostgreSQL, MongoDB, Uploads)
# Installiert als /usr/local/sbin/hausanna-backup, ausgeführt von hausanna-backup.timer.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hausanna}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/hausanna/uploads}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"
TARGET="${BACKUP_DIR}/${STAMP}"

log() { echo "[backup] $*"; }

umask 077
mkdir -p "${TARGET}"

log "PostgreSQL sichern …"
runuser -u postgres -- pg_dump --format=custom --dbname=hausanna > "${TARGET}/postgres-hausanna.dump"

log "MongoDB sichern …"
# Zugangsdaten stehen als Umgebungsvariablen im Container (aus /etc/hausanna/mongodb.env)
# shellcheck disable=SC2016  # $-Variablen werden absichtlich erst im Container aufgelöst
podman exec hausanna-mongodb sh -c \
  'mongodump --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db hausanna --archive --gzip' \
  > "${TARGET}/mongodb-hausanna.archive.gz"

log "Uploads sichern …"
tar -czf "${TARGET}/uploads.tar.gz" -C "$(dirname "${UPLOAD_DIR}")" "$(basename "${UPLOAD_DIR}")"

log "Alte Backups (> ${KEEP_DAYS} Tage) löschen …"
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +

log "Fertig: ${TARGET} ($(du -sh "${TARGET}" | cut -f1))"
