#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

# shellcheck source=scripts/lib/env-utils.sh
source "$REPO_ROOT/scripts/lib/env-utils.sh"

BALCAO_ENV_DIR="$REPO_ROOT/.balcao-env"
PIDS_DIR="$BALCAO_ENV_DIR/pids"
STATE_FILE="$BALCAO_ENV_DIR/state.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"

if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

compute_instance_vars "$REPO_ROOT"

stop_service "$PIDS_DIR/web.pid" "vite"
stop_service "$PIDS_DIR/worker.pid" "src/jobs/triage-worker.ts"
stop_service "$PIDS_DIR/api.pid" "src/main.ts"

COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true

exit 0
