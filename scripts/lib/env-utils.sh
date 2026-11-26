#!/usr/bin/env bash

compute_instance_vars() {
  local repo_root="$1"
  local physical_root
  physical_root="$(cd "$repo_root" && pwd -P)"

  local base_name
  base_name="$(basename "$physical_root")"

  local slug16
  local hash8
  local result
  result="$(node -e '
    const crypto = require("node:crypto");
    const physicalRoot = process.argv[1];
    const baseName = process.argv[2];
    const hash8 = crypto.createHash("sha256").update(physicalRoot).digest("hex").slice(0, 8);
    let slug = baseName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    slug = slug.slice(0, 16).replace(/-+$/g, "");
    if (!slug) slug = "repo";
    process.stdout.write(`${slug}|${hash8}`);
  ' "$physical_root" "$base_name")"

  slug16="${result%%|*}"
  hash8="${result#*|}"

  INSTANCE_ID="balcao-${slug16}-${hash8}"
  COMPOSE_PROJECT_NAME="$INSTANCE_ID"
  DB_NAME="balcao_${hash8}"
  UPLOAD_DIR="${physical_root}/.balcao-env/uploads"

  export INSTANCE_ID COMPOSE_PROJECT_NAME DB_NAME UPLOAD_DIR
}

is_service_alive() {
  local pid_file="$1"
  local cmd_pattern="$2"

  if [ ! -f "$pid_file" ]; then
    return 1
  fi

  local pid
  pid="$(tr -d '[:space:]' < "$pid_file" 2>/dev/null || true)"
  if ! [[ "$pid" =~ ^[0-9]+$ ]] || [ "$pid" -le 0 ]; then
    return 1
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    return 1
  fi

  local cmdline
  cmdline="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  if [ -z "$cmdline" ]; then
    return 1
  fi

  if [[ "$cmdline" == *"$cmd_pattern"* ]]; then
    return 0
  fi

  return 1
}

_collect_descendants() {
  local parent_pid="$1"
  local child
  local children
  children="$(pgrep -P "$parent_pid" 2>/dev/null || true)"
  for child in $children; do
    if [[ "$child" =~ ^[0-9]+$ ]]; then
      _collect_descendants "$child"
      printf '%s\n' "$child"
    fi
  done
}

stop_service() {
  local pid_file="$1"
  local cmd_pattern="$2"

  if [ ! -f "$pid_file" ]; then
    return 0
  fi

  if ! is_service_alive "$pid_file" "$cmd_pattern"; then
    rm -f "$pid_file"
    return 0
  fi

  local pid
  pid="$(tr -d '[:space:]' < "$pid_file")"

  local descendants
  descendants="$(_collect_descendants "$pid" || true)"

  local target
  for target in $descendants "$pid"; do
    kill -TERM "$target" 2>/dev/null || true
  done

  local elapsed=0
  while [ "$elapsed" -lt 25 ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.2
    elapsed=$((elapsed + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    local remaining_descendants
    remaining_descendants="$(_collect_descendants "$pid" || true)"
    for target in $remaining_descendants $descendants "$pid"; do
      kill -KILL "$target" 2>/dev/null || true
    done
    sleep 0.2
  fi

  rm -f "$pid_file"
  return 0
}

wait_for_http() {
  local url="$1"
  local timeout_sec="$2"
  local expected_substring="${3:-}"

  node -e '
    const url = process.argv[1];
    const timeoutMs = Number(process.argv[2]) * 1000;
    const expected = process.argv[3] || "";
    const deadline = Date.now() + timeoutMs;

    async function check() {
      while (true) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
          if (res.status === 200) {
            if (!expected) {
              process.exit(0);
            }
            const body = await res.text();
            if (body.includes(expected)) {
              process.exit(0);
            }
          }
        } catch {
          // Retry until timeout
        }

        if (Date.now() >= deadline) {
          process.exit(1);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    check();
  ' "$url" "$timeout_sec" "$expected_substring"
}

ensure_npm_ci() {
  local dir="$1"
  local lock_file="$dir/package-lock.json"
  local node_modules_dir="$dir/node_modules"
  local hash_file="$node_modules_dir/.balcao-lock-hash"

  local lock_hash
  lock_hash="$(node -e '
    const fs = require("node:fs");
    const crypto = require("node:crypto");
    const content = fs.readFileSync(process.argv[1]);
    process.stdout.write(crypto.createHash("sha256").update(content).digest("hex"));
  ' "$lock_file")"

  local current_hash=""
  if [ -f "$hash_file" ]; then
    current_hash="$(tr -d '[:space:]' < "$hash_file" 2>/dev/null || true)"
  fi

  if [ ! -d "$node_modules_dir" ] || [ "$current_hash" != "$lock_hash" ]; then
    echo "Instalando dependências em $dir (npm ci)..."
    (cd "$dir" && npm ci)
    mkdir -p "$node_modules_dir"
    printf '%s\n' "$lock_hash" > "$hash_file"
  fi
}

spawn_detached() {
  local workdir="$1"
  local log_file="$2"
  local pid_file="$3"
  shift 3

  : > "$log_file"
  local pid
  pid="$(node -e '
    const fs = require("node:fs");
    const { spawn } = require("node:child_process");
    const [workdir, logFile, cmd, ...args] = process.argv.slice(1);
    const out = fs.openSync(logFile, "a");
    const child = spawn(cmd, args, {
      cwd: workdir,
      detached: true,
      stdio: ["ignore", out, out],
    });
    child.unref();
    fs.closeSync(out);
    process.stdout.write(String(child.pid));
  ' -- "$workdir" "$log_file" "$@")"

  printf '%s\n' "$pid" > "$pid_file"
}
