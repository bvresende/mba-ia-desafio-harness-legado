# CLI & Runtime Contracts: Ambiente Isolado (`001-ambiente-isolado`)

## 1. Comandos Raiz (`package.json`)

### `npm run up` → `bash scripts/up.sh`

- **Pré-condições**: Linux ou macOS, Docker em execução (`docker compose`), Git e Node.js LTS (>= 22). Não exige `node_modules`, `.env` nem nenhum passo manual anterior.
- **Comportamento**:
  1. Configura `git config core.hooksPath .githooks`.
  2. Calcula `INSTANCE_ID` e resolve portas livres (`DB_PORT`, `API_PORT`, `WEB_PORT`) preservando recursos saudáveis da própria cópia em reexecuções.
  3. Gera `api/.env` e `web/.env.local` (ambos ignorados no Git) e cria `UPLOAD_DIR` (`<repo-root>/.balcao-env/uploads`).
  4. Instala dependências em `api/` e `web/` via `npm ci` apenas quando necessário (sem modificar `package-lock.json`).
  5. Sobe Postgres dedicado (`docker compose -p "$COMPOSE_PROJECT_NAME" up -d`) e aguarda `pg_isready`.
  6. Executa `npx prisma generate` (quando necessário), `npx prisma migrate deploy` e `npm run seed` (idempotente).
  7. Garante API, worker e front em execução (processos separados em segundo plano com logs em `.balcao-env/logs/` e PIDs em `.balcao-env/pids/`).
  8. Aguarda health check da API (`GET /api/health` retornando `200` com `"db":"ok"`), estabilidade do worker e resposta `200` do front Vite.
- **Saída obrigatória em stdout (ao concluir com código 0)**:
  ```text
  Balcão no ar!
  Instância:  <INSTANCE_ID>
  API:        http://localhost:<API_PORT>
  Front:      http://localhost:<WEB_PORT>
  Banco:      postgresql://balcao:balcao@localhost:<DB_PORT>/<DB_NAME> (container: <COMPOSE_PROJECT_NAME>)
  Anexos:     <UPLOAD_DIR>
  IA:         fake (sem chave)
  ```
- **Códigos de saída**: `0` em sucesso; diferente de zero em falha (exibindo qual etapa falhou e o log correspondente).

### `npm run down` → `bash scripts/down.sh`

- **Comportamento**:
  1. Carrega `.balcao-env/state.env` (se existir; se não existir, encerra com sucesso informando que a cópia não possui estado ativo).
  2. Encerra os processos registrados em `.balcao-env/pids/{web,worker,api}.pid` (e seus filhos diretos) com `SIGTERM` e fallback `SIGKILL`, removendo os arquivos `.pid`.
  3. Executa `docker compose -p "$COMPOSE_PROJECT_NAME" down` para encerrar exclusivamente o container/rede daquela cópia.
- **Códigos de saída**: `0` mesmo se a cópia já estiver parada; nunca encerra processos ou containers de outras cópias.

## 2. Variáveis de Ambiente Geradas por Cópia

### `api/.env` (gerado automaticamente, gitignored)

```dotenv
DATABASE_URL=postgresql://balcao:balcao@localhost:<DB_PORT>/<DB_NAME>
DATABASE_URL_TEST=postgresql://balcao:balcao@localhost:<DB_PORT>/<DB_NAME>_test
JWT_SECRET=dev-secret
AI_MODE=fake
OPENAI_API_KEY=
UPLOAD_DIR=<repo-root>/.balcao-env/uploads
PORT=<API_PORT>
CORS_ORIGIN=http://localhost:<WEB_PORT>,http://127.0.0.1:<WEB_PORT>
TRIAGE_INTERVAL_MS=2000
```

### `web/.env.local` (gerado automaticamente, gitignored)

```dotenv
VITE_API_URL=http://localhost:<API_PORT>
VITE_PORT=<WEB_PORT>
```

## 3. Contrato HTTP Preservado

- Nenhum endpoint, payload, status code ou código de erro de `/api/*` é alterado.
- O header CORS `Access-Control-Allow-Origin` passa a refletir a origem permitida da cópia atual (`http://localhost:<WEB_PORT>` ou `http://127.0.0.1:<WEB_PORT>`).
- Validação normativa: `API_URL=http://localhost:<API_PORT> npm test` dentro de `blackbox/` deve passar 100%.
