#!/usr/bin/env bash
# =============================================================================
# Haus Anna Bodenmais – Erstinstallation auf AlmaLinux 10 (IONOS VPS)
#
# Aufruf als root:   bash install.sh
# Erneut ausführbar (idempotent). Bestehende Konfiguration in /etc/hausanna
# wird NIE überschrieben.
#
# Nur TLS nachholen (nach DNS-Umstellung):   bash install.sh --tls-only
# =============================================================================
set -euo pipefail

# ----------------------------- Einstellungen --------------------------------
DOMAIN="${DOMAIN:-hausanna-bodenmais.de}"
ADMIN_EMAIL="${ADMIN_EMAIL:-info@hausanna-bodenmais.de}"   # erster Admin-Login
LE_EMAIL="${LE_EMAIL:-info@hausanna-bodenmais.de}"         # Let's-Encrypt-Hinweise
REPO_URL="${REPO_URL:-https://github.com/ReneSchneider98/hausanna-bodenmais.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
# Mindestversion von Node.js (siehe package.json "engines")
NODE_MIN_MAJOR=22
NODE_MIN_MINOR=12
# ----------------------------------------------------------------------------

APP_USER=hausanna
APP_DIR=/opt/hausanna
DATA_DIR=/var/lib/hausanna
UPLOAD_DIR=${DATA_DIR}/uploads
CONF_DIR=/etc/hausanna
BACKUP_DIR=/var/backups/hausanna
DEPLOY_SRC=${APP_DIR}/deploy/almalinux

TLS_ONLY=false
[[ "${1:-}" == "--tls-only" ]] && TLS_ONLY=true

log()  { echo -e "\n\033[1;32m==> $*\033[0m"; }
info() { echo "    $*"; }
warn() { echo -e "\033[1;33m[WARNUNG]\033[0m $*"; }
die()  { echo -e "\033[1;31m[FEHLER]\033[0m $*" >&2; exit 1; }

as_app() { runuser -u "${APP_USER}" -- env HOME="${DATA_DIR}" PATH="/usr/local/bin:/usr/bin:/bin" "$@"; }
rand()   { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-32}"; }

[[ $EUID -eq 0 ]] || die "Bitte als root ausführen (sudo -i)."
grep -q 'release 10' /etc/almalinux-release 2>/dev/null || warn "Kein AlmaLinux 10 erkannt – Skript ist dafür gebaut."

# =============================================================================
# TLS (Let's Encrypt) – wird am Ende und mit --tls-only aufgerufen
# =============================================================================
setup_tls() {
  log "HTTPS-Zertifikat (Let's Encrypt) einrichten"
  local server_ip dns_ip
  server_ip="$(curl -4 -fsS --max-time 10 https://api.ipify.org || true)"
  dns_ip="$(getent ahostsv4 "${DOMAIN}" | awk 'NR==1{print $1}' || true)"
  info "Server-IP: ${server_ip:-unbekannt} | ${DOMAIN} zeigt auf: ${dns_ip:-unbekannt}"

  if [[ -z "${server_ip}" || "${server_ip}" != "${dns_ip}" ]]; then
    warn "Die Domain zeigt noch nicht auf diesen Server (vermutlich noch altes WordPress)."
    warn "Webseite läuft vorerst nur per HTTP über die Server-IP."
    warn "Nach der DNS-Umstellung ausführen:  bash ${DEPLOY_SRC}/install.sh --tls-only"
    return 0
  fi

  mkdir -p /var/www/letsencrypt
  local domains=(-d "${DOMAIN}")
  if getent ahostsv4 "www.${DOMAIN}" >/dev/null; then domains+=(-d "www.${DOMAIN}"); fi

  if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    certbot certonly --webroot -w /var/www/letsencrypt "${domains[@]}" \
      --email "${LE_EMAIL}" --agree-tos --non-interactive --keep-until-expiring
  else
    info "Zertifikat existiert bereits."
  fi

  sed "s/__DOMAIN__/${DOMAIN}/g" "${DEPLOY_SRC}/nginx/hausanna.conf" > /etc/nginx/conf.d/hausanna.conf
  nginx -t
  systemctl reload nginx

  # nginx nach jeder Erneuerung neu laden
  mkdir -p /etc/letsencrypt/renewal-hooks/deploy
  cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
  chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
  systemctl enable --now certbot-renew.timer
  info "HTTPS aktiv: https://${DOMAIN}"
}

if $TLS_ONLY; then
  setup_tls
  exit 0
fi

# =============================================================================
log "1/12 System aktualisieren und Pakete installieren"
# =============================================================================
dnf -y upgrade --refresh
dnf -y install epel-release
dnf -y install git curl tar openssl nginx podman firewalld \
  policycoreutils-python-utils postgresql-server postgresql-contrib \
  certbot nodejs npm

# -----------------------------------------------------------------------------
log "2/12 Node.js prüfen (mind. ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR})"
# -----------------------------------------------------------------------------
node_ok() {
  command -v node >/dev/null || return 1
  node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>${NODE_MIN_MAJOR}||(a===${NODE_MIN_MAJOR}&&b>=${NODE_MIN_MINOR})?0:1)"
}
if node_ok; then
  info "Node.js $(node -v) aus AlmaLinux AppStream wird verwendet."
else
  warn "Node.js aus AppStream ist zu alt ($(node -v 2>/dev/null || echo 'fehlt'))."
  info "Installiere offizielles Node.js ${NODE_MIN_MAJOR} LTS nach /usr/local …"
  tmp="$(mktemp -d)"
  base="https://nodejs.org/dist/latest-v${NODE_MIN_MAJOR}.x"
  file="$(curl -fsS "${base}/SHASUMS256.txt" | awk '/linux-x64.tar.xz$/{print $2}')"
  curl -fsSL -o "${tmp}/${file}" "${base}/${file}"
  (cd "${tmp}" && curl -fsS "${base}/SHASUMS256.txt" | grep " ${file}\$" | sha256sum -c -)
  tar -xJf "${tmp}/${file}" -C /usr/local --strip-components=1 --exclude='*.md' --exclude=LICENSE
  rm -rf "${tmp}"
  hash -r
  node_ok || die "Node.js-Installation fehlgeschlagen."
  info "Node.js $(node -v) installiert (/usr/local/bin/node)."
fi

# -----------------------------------------------------------------------------
log "3/12 Swap prüfen (Build braucht Reserve bei 4 GB RAM)"
# -----------------------------------------------------------------------------
if [[ -z "$(swapon --noheadings)" ]]; then
  info "Lege 2 GB Swap-Datei an …"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap defaults 0 0' >> /etc/fstab
else
  info "Swap vorhanden."
fi

# -----------------------------------------------------------------------------
log "4/12 Benutzer und Verzeichnisse"
# -----------------------------------------------------------------------------
if ! id "${APP_USER}" &>/dev/null; then
  useradd --system --home-dir "${DATA_DIR}" --shell /sbin/nologin "${APP_USER}"
  info "Systembenutzer ${APP_USER} angelegt."
fi
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${DATA_DIR}" "${UPLOAD_DIR}"
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
install -d -m 750 -o root -g "${APP_USER}" "${CONF_DIR}"
install -d -m 700 -o root -g root "${BACKUP_DIR}"
install -d -m 755 /var/www/letsencrypt

# -----------------------------------------------------------------------------
log "5/12 Code holen (${REPO_URL}, Branch ${REPO_BRANCH})"
# -----------------------------------------------------------------------------
if [[ -d "${APP_DIR}/.git" ]]; then
  as_app git -C "${APP_DIR}" fetch --prune origin
  as_app git -C "${APP_DIR}" checkout "${REPO_BRANCH}"
  as_app git -C "${APP_DIR}" pull --ff-only origin "${REPO_BRANCH}"
else
  as_app git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

# -----------------------------------------------------------------------------
log "6/12 Konfiguration /etc/hausanna (wird nie überschrieben)"
# -----------------------------------------------------------------------------
if [[ ! -f "${CONF_DIR}/api.env" ]]; then
  PG_PASSWORD="$(rand 32)"
  MONGO_PASSWORD="$(rand 32)"
  ADMIN_PASSWORD="$(rand 20)"
  sed -e "s|__PG_PASSWORD__|${PG_PASSWORD}|" \
      -e "s|__MONGO_PASSWORD__|${MONGO_PASSWORD}|" \
      -e "s|__JWT_SECRET__|$(rand 64)|" \
      -e "s|__BEDS24_WEBHOOK_SECRET__|$(rand 40)|" \
      -e "s|__ADMIN_EMAIL__|${ADMIN_EMAIL}|" \
      -e "s|__ADMIN_PASSWORD__|${ADMIN_PASSWORD}|" \
      -e "s|__DOMAIN__|${DOMAIN}|g" \
      "${DEPLOY_SRC}/api.env.example" > "${CONF_DIR}/api.env"
  chown root:"${APP_USER}" "${CONF_DIR}/api.env"
  chmod 640 "${CONF_DIR}/api.env"
  ADMIN_PASSWORD_NEW="${ADMIN_PASSWORD}"
  info "api.env erzeugt."
else
  info "api.env existiert – bleibt unverändert."
fi

# Passwörter aus api.env lesen (Quelle der Wahrheit)
DATABASE_URL="$(grep -E '^DATABASE_URL=' "${CONF_DIR}/api.env" | cut -d= -f2-)"
MONGODB_URL="$(grep -E '^MONGODB_URL=' "${CONF_DIR}/api.env" | cut -d= -f2-)"
[[ "${DATABASE_URL}" =~ ^postgres(ql)?://([^:]+):([^@]+)@ ]] || die "DATABASE_URL in api.env nicht lesbar."
PG_USER="${BASH_REMATCH[2]}"; PG_PASSWORD="${BASH_REMATCH[3]}"
[[ "${MONGODB_URL}" =~ ^mongodb://([^:]+):([^@]+)@ ]] || die "MONGODB_URL in api.env nicht lesbar."
MONGO_USER="${BASH_REMATCH[1]}"; MONGO_PASSWORD="${BASH_REMATCH[2]}"

if [[ ! -f "${CONF_DIR}/mongodb.env" ]]; then
  printf 'MONGO_INITDB_ROOT_USERNAME=%s\nMONGO_INITDB_ROOT_PASSWORD=%s\n' "${MONGO_USER}" "${MONGO_PASSWORD}" > "${CONF_DIR}/mongodb.env"
  chmod 600 "${CONF_DIR}/mongodb.env"
  info "mongodb.env erzeugt."
fi

# -----------------------------------------------------------------------------
log "7/12 PostgreSQL einrichten"
# -----------------------------------------------------------------------------
if [[ ! -f /var/lib/pgsql/data/PG_VERSION ]]; then
  postgresql-setup --initdb
fi
PG_CONF=/var/lib/pgsql/data/postgresql.conf
PG_HBA=/var/lib/pgsql/data/pg_hba.conf
grep -q "^listen_addresses = 'localhost'" "${PG_CONF}" || echo "listen_addresses = 'localhost'" >> "${PG_CONF}"
grep -q "^password_encryption = scram-sha-256" "${PG_CONF}" || echo "password_encryption = scram-sha-256" >> "${PG_CONF}"
# TCP-Verbindungen von localhost per Passwort (scram) statt ident
if ! grep -q 'hausanna-managed' "${PG_HBA}"; then
  sed -i -E 's/^(host\s+all\s+all\s+(127\.0\.0\.1\/32|::1\/128)\s+)ident/\1scram-sha-256/' "${PG_HBA}"
  echo "# hausanna-managed: localhost nutzt scram-sha-256" >> "${PG_HBA}"
fi
systemctl enable --now postgresql
systemctl restart postgresql

psql_su() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qtA "$@"; }
if [[ "$(psql_su -c "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'")" != "1" ]]; then
  psql_su -c "CREATE ROLE \"${PG_USER}\" LOGIN"
fi
psql_su -c "ALTER ROLE \"${PG_USER}\" PASSWORD '${PG_PASSWORD}'"
if [[ "$(psql_su -c "SELECT 1 FROM pg_database WHERE datname='hausanna'")" != "1" ]]; then
  psql_su -c "CREATE DATABASE hausanna OWNER \"${PG_USER}\" ENCODING 'UTF8' TEMPLATE template0"
fi
# btree_gist für die Doppelbuchungs-Sperre (braucht Superuser)
psql_su -d hausanna -c "CREATE EXTENSION IF NOT EXISTS btree_gist"
info "PostgreSQL bereit (Datenbank hausanna, nur localhost)."

# -----------------------------------------------------------------------------
log "8/12 MongoDB (Podman Quadlet) einrichten"
# -----------------------------------------------------------------------------
install -d /etc/containers/systemd
install -m 644 "${DEPLOY_SRC}/hausanna-mongodb.container" /etc/containers/systemd/hausanna-mongodb.container
systemctl daemon-reload
systemctl start hausanna-mongodb.service
info "Warte auf MongoDB …"
for _ in $(seq 1 60); do
  if podman exec hausanna-mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q 1; then
    info "MongoDB läuft."; break
  fi
  sleep 2
done

# -----------------------------------------------------------------------------
log "9/12 App bauen (pnpm)"
# -----------------------------------------------------------------------------
PNPM_VERSION="$(sed -nE 's/.*"packageManager": *"pnpm@([^"]+)".*/\1/p' "${APP_DIR}/package.json")"
if ! command -v pnpm >/dev/null || [[ "$(pnpm -v)" != "${PNPM_VERSION}" ]]; then
  npm install -g "pnpm@${PNPM_VERSION}"
fi
as_app bash -c "cd '${APP_DIR}' && pnpm install --frozen-lockfile && NODE_OPTIONS=--max-old-space-size=1536 pnpm build"

# -----------------------------------------------------------------------------
log "10/12 Dienste (systemd) installieren"
# -----------------------------------------------------------------------------
install -m 644 "${DEPLOY_SRC}/systemd/hausanna-api.service"    /etc/systemd/system/
install -m 644 "${DEPLOY_SRC}/systemd/hausanna-web.service"    /etc/systemd/system/
install -m 644 "${DEPLOY_SRC}/systemd/hausanna-backup.service" /etc/systemd/system/
install -m 644 "${DEPLOY_SRC}/systemd/hausanna-backup.timer"   /etc/systemd/system/
install -m 755 "${DEPLOY_SRC}/backup.sh" /usr/local/sbin/hausanna-backup
systemctl daemon-reload
systemctl enable --now hausanna-api.service hausanna-web.service hausanna-backup.timer
systemctl restart hausanna-api.service hausanna-web.service

info "Warte auf API-Health-Check …"
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then info "API antwortet."; break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:3000/api/health || warn "API antwortet (noch) nicht – siehe: journalctl -u hausanna-api -n 100"
echo

# -----------------------------------------------------------------------------
log "11/12 SELinux, Firewall, nginx"
# -----------------------------------------------------------------------------
setsebool -P httpd_can_network_connect 1
semanage fcontext -a -t httpd_sys_content_t "${APP_DIR}/apps/admin/dist(/.*)?" 2>/dev/null \
  || semanage fcontext -m -t httpd_sys_content_t "${APP_DIR}/apps/admin/dist(/.*)?"
# nginx liest Uploads; die API (systemd-Dienst) schreibt sie
semanage fcontext -a -t httpd_sys_content_t "${UPLOAD_DIR}(/.*)?" 2>/dev/null \
  || semanage fcontext -m -t httpd_sys_content_t "${UPLOAD_DIR}(/.*)?"
restorecon -R "${APP_DIR}/apps/admin/dist" "${UPLOAD_DIR}" /var/www/letsencrypt

systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --remove-service=cockpit 2>/dev/null || true
firewall-cmd --reload

if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  sed "s/__DOMAIN__/${DOMAIN}/g" "${DEPLOY_SRC}/nginx/hausanna-http.conf" > /etc/nginx/conf.d/hausanna.conf
else
  sed "s/__DOMAIN__/${DOMAIN}/g" "${DEPLOY_SRC}/nginx/hausanna.conf" > /etc/nginx/conf.d/hausanna.conf
fi
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# -----------------------------------------------------------------------------
log "12/12 HTTPS"
# -----------------------------------------------------------------------------
setup_tls

# =============================================================================
log "Fertig!"
# =============================================================================
cat <<EOF

  Webseite:      http://${DOMAIN}  (HTTPS sobald DNS umgestellt ist)
  Admin-Panel:   /admin/
  Status:        systemctl status hausanna-api hausanna-web hausanna-mongodb nginx postgresql
  Logs:          journalctl -u hausanna-api -f
  Konfiguration: ${CONF_DIR}/api.env   (danach: systemctl restart hausanna-api)
  Backups:       ${BACKUP_DIR} (täglich 03:30)
EOF
if [[ -n "${ADMIN_PASSWORD_NEW:-}" ]]; then
  cat <<EOF

  >>> Erster Admin-Login (nur jetzt sichtbar, bitte sofort ändern):
      E-Mail:   ${ADMIN_EMAIL}
      Passwort: ${ADMIN_PASSWORD_NEW}

  >>> Noch eintragen in ${CONF_DIR}/api.env: SMTP_PASSWORD, BEDS24_REFRESH_TOKEN
EOF
fi
