#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

# shellcheck source=scripts/lib/env-utils.sh
source "$REPO_ROOT/scripts/lib/env-utils.sh"

git -C "$REPO_ROOT" config core.hooksPath .githooks

BALCAO_ENV_DIR="$REPO_ROOT/.balcao-env"
PIDS_DIR="$BALCAO_ENV_DIR/pids"
LOGS_DIR="$BALCAO_ENV_DIR/logs"
STATE_FILE="$BALCAO_ENV_DIR/state.env"

mkdir -p "$PIDS_DIR" "$LOGS_DIR" "$BALCAO_ENV_DIR/uploads"

if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

compute_instance_vars "$REPO_ROOT"

API_PID_FILE="$PIDS_DIR/api.pid"
WORKER_PID_FILE="$PIDS_DIR/worker.pid"
WEB_PID_FILE="$PIDS_DIR/web.pid"

COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"

mapped_db_port="$(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" port db 5432 2>/dev/null | awk -F: 'NR==1 {print $NF}' || true)"
if [[ "$mapped_db_port" =~ ^[0-9]+$ ]]; then
  DB_PORT="$mapped_db_port"
else
  DB_PORT="$(node "$REPO_ROOT/scripts/lib/find-port.mjs" --preferred "${DB_PORT:-5432}")"
fi

if [ -n "${API_PORT:-}" ] && is_service_alive "$API_PID_FILE" "src/main.ts" && wait_for_http "http://localhost:${API_PORT}/api/health" 2 '"db":"ok"'; then
  :
else
  stop_service "$API_PID_FILE" "src/main.ts"
  API_PORT="$(node "$REPO_ROOT/scripts/lib/find-port.mjs" --preferred "${API_PORT:-4000}" --exclude "$DB_PORT")"
fi

if [ -n "${WEB_PORT:-}" ] && is_service_alive "$WEB_PID_FILE" "vite" && wait_for_http "http://localhost:${WEB_PORT}" 2; then
  :
else
  stop_service "$WEB_PID_FILE" "vite"
  WEB_PORT="$(node "$REPO_ROOT/scripts/lib/find-port.mjs" --preferred "${WEB_PORT:-5173}" --exclude "$DB_PORT,$API_PORT")"
fi

cat > "$STATE_FILE" <<EOF
INSTANCE_ID=$INSTANCE_ID
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME
DB_NAME=$DB_NAME
DB_PORT=$DB_PORT
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
UPLOAD_DIR=$UPLOAD_DIR
EOF

API_ENV_FILE="$REPO_ROOT/api/.env"
WEB_ENV_FILE="$REPO_ROOT/web/.env.local"

new_api_env="$(cat <<EOF
DATABASE_URL=postgresql://balcao:balcao@localhost:${DB_PORT}/${DB_NAME}
DATABASE_URL_TEST=postgresql://balcao:balcao@localhost:${DB_PORT}/${DB_NAME}_test
JWT_SECRET=dev-secret
AI_MODE=fake
OPENAI_API_KEY=
UPLOAD_DIR=${UPLOAD_DIR}
PORT=${API_PORT}
CORS_ORIGIN=http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT}
TRIAGE_INTERVAL_MS=2000
EOF
)"

API_ENV_CHANGED=0
if [ ! -f "$API_ENV_FILE" ] || [ "$(cat "$API_ENV_FILE")" != "$new_api_env" ]; then
  printf '%s\n' "$new_api_env" > "$API_ENV_FILE"
  API_ENV_CHANGED=1
fi

new_web_env="$(cat <<EOF
VITE_API_URL=http://localhost:${API_PORT}
VITE_PORT=${WEB_PORT}
EOF
)"

WEB_ENV_CHANGED=0
if [ ! -f "$WEB_ENV_FILE" ] || [ "$(cat "$WEB_ENV_FILE")" != "$new_web_env" ]; then
  printf '%s\n' "$new_web_env" > "$WEB_ENV_FILE"
  WEB_ENV_CHANGED=1
fi

ensure_npm_ci "$REPO_ROOT/api"
ensure_npm_ci "$REPO_ROOT/web"

COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" DB_PORT="$DB_PORT" POSTGRES_DB="$DB_NAME" \
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" up -d

pg_ready=0
for _ in $(seq 1 45); do
  if docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" exec -T db pg_isready -U balcao -d "$DB_NAME" >/dev/null 2>&1; then
    pg_ready=1
    break
  fi
  sleep 1
done

if [ "$pg_ready" -ne 1 ]; then
  echo "Erro: Postgres ($COMPOSE_PROJECT_NAME) não ficou pronto após 45s." >&2
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" logs --tail=30 db >&2 || true
  exit 1
fi

if [ ! -d "$REPO_ROOT/api/node_modules/.prisma/client" ]; then
  (cd "$REPO_ROOT/api" && npx prisma generate)
fi

(cd "$REPO_ROOT/api" && npx prisma migrate deploy)
(cd "$REPO_ROOT/api" && npm run seed)

API_LOG="$LOGS_DIR/api.log"
WORKER_LOG="$LOGS_DIR/worker.log"
WEB_LOG="$LOGS_DIR/web.log"

if [ "$API_ENV_CHANGED" -eq 1 ] || ! is_service_alive "$API_PID_FILE" "src/main.ts"; then
  stop_service "$API_PID_FILE" "src/main.ts"
  nohup bash -c 'cd "$1" && exec ./node_modules/.bin/tsx --env-file=.env src/main.ts' _ "$REPO_ROOT/api" \
    > "$API_LOG" 2>&1 < /dev/null &
  echo "$!" > "$API_PID_FILE"
fi

if [ "$API_ENV_CHANGED" -eq 1 ] || ! is_service_alive "$WORKER_PID_FILE" "src/jobs/triage-worker.ts"; then
  stop_service "$WORKER_PID_FILE" "src/jobs/triage-worker.ts"
  nohup bash -c 'cd "$1" && exec ./node_modules/.bin/tsx --env-file=.env src/jobs/triage-worker.ts' _ "$REPO_ROOT/api" \
    > "$WORKER_LOG" 2>&1 < /dev/null &
  echo "$!" > "$WORKER_PID_FILE"
fi

if [ "$WEB_ENV_CHANGED" -eq 1 ] || ! is_service_alive "$WEB_PID_FILE" "vite"; then
  stop_service "$WEB_PID_FILE" "vite"
  nohup bash -c 'cd "$1" && VITE_PORT="$2" exec ./node_modules/.bin/vite --port "$2" --strictPort --host localhost' _ "$REPO_ROOT/web" "$WEB_PORT" \
    > "$WEB_LOG" 2>&1 < /dev/null &
  echo "$!" > "$WEB_PID_FILE"
fi

if ! wait_for_http "http://localhost:${API_PORT}/api/health" 30 '"db":"ok"'; then
  echo "Erro: API não respondeu saudável em http://localhost:${API_PORT}/api/health" >&2
  tail -n 40 "$API_LOG" >&2 || true
  exit 1
fi

sleep 1
if ! is_service_alive "$WORKER_PID_FILE" "src/jobs/triage-worker.ts"; then
  echo "Erro: worker de triagem encerrou inesperadamente." >&2
  cat "$WORKER_LOG" >&2 || true
  exit 1
fi

if ! wait_for_http "http://localhost:${WEB_PORT}" 30; then
  echo "Erro: front Vite não respondeu em http://localhost:${WEB_PORT}" >&2
  tail -n 40 "$WEB_LOG" >&2 || true
  exit 1
fi

cat <<EOF
Balcão no ar!
Instância:  ${INSTANCE_ID}
API:        http://localhost:${API_PORT}
Front:      http://localhost:${WEB_PORT}
Banco:      postgresql://balcao:balcao@localhost:${DB_PORT}/${DB_NAME} (container: ${COMPOSE_PROJECT_NAME})
Anexos:     ${UPLOAD_DIR}
IA:         fake (sem chave)
EOF
