---
description: "Task list for Feature 001: Ambiente Isolado e Idempotente por Cópia"
---

# Tasks: Ambiente Isolado e Idempotente por Cópia

**Input**: Design documents from `/specs/001-ambiente-isolado/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cli-interface.md`, `quickstart.md`

**Tests**: Validação executável via testes unitários existentes (`api/src/**/*.test.ts`), suíte caixa-preta (`blackbox/`) e cenários ponta a ponta do `quickstart.md` (incluindo 2 worktrees simultâneas e verificação visual via subagente `browser`).

**Organization**: Tarefas organizadas por fase e User Story (`US1`–`US4`) para implementação e validação incrementais.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos distintos, sem dependência de tarefa pendente)
- **[Story]**: User Story atendida (`US1`, `US2`, `US3`, `US4`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar interface CLI raiz, `.gitignore` para artefatos efêmeros e hook Git versionado.

- [X] T001 Atualizar `.gitignore` na raiz para ignorar `.balcao-env/`, `.env.local` e `.env.*.local` mantendo `.specify/`, `.agents/` e `specs/` versionados
- [X] T002 [P] Criar `package.json` na raiz expondo os scripts `up` (`bash scripts/up.sh`) e `down` (`bash scripts/down.sh`) conforme `contracts/cli-interface.md`
- [X] T003 [P] Criar hook executável `.githooks/pre-commit` (estrutura pronta para acionar os gates na Spec 002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Utilitários portáteis (Linux/macOS) de alocação de portas, identidade de instância, controle de processos e parametrização do Docker Compose.

**⚠️ CRITICAL**: Todas as User Stories dependem desta fundação.

- [X] T004 [P] Criar alocador portátil de portas livres em `scripts/lib/find-port.mjs` (via `node:net`, suporte a porta preferida e `--exclude`) garantindo as restrições de `data-model.md` para `WorktreeInstanceState.DB_PORT`, `WorktreeInstanceState.API_PORT` e `WorktreeInstanceState.WEB_PORT`
- [X] T005 [P] Criar biblioteca shell `scripts/lib/env-utils.sh` implementando geração determinística de `WorktreeInstanceState.INSTANCE_ID`, `WorktreeInstanceState.COMPOSE_PROJECT_NAME`, `WorktreeInstanceState.DB_NAME` e `WorktreeInstanceState.UPLOAD_DIR` (citados em `data-model.md`), helpers de `ProcessPidRecord.PID` (verificação de processo vivo e encerramento seguro da árvore) e esperas de readiness HTTP/Postgres
- [X] T006 [P] Parametrizar `docker-compose.yml` com `${DB_PORT:-5432}:5432`, `POSTGRES_DB: ${POSTGRES_DB:-balcao}` e `healthcheck` com `pg_isready`
- [X] T007 [P] Atualizar `api/.env.example` incluindo `CORS_ORIGIN=http://localhost:5173` preservando todos os defaults existentes

**Checkpoint**: Fundação pronta — tarefas de `api/`, `web/` e `scripts/up.sh` podem avançar.

---

## Phase 3: User Story 1 - Subida completa a partir de clone limpo (Priority: P1) 🎯 MVP

**Goal**: Um único comando `npm run up` em clone limpo configura hook Git, instala dependências sem alterar lockfiles, sobe Postgres dedicado, aplica migrations e seed, inicia API, worker e front e exibe endereços, banco e pasta de anexos.

**Independent Test**: Rodar `npm run up` em estado limpo, verificar saída com API/Front/Banco/Anexos/IA fake, `git config --get core.hooksPath` = `.githooks`, login com contas da seed e `GET /api/health`.

### Implementation for User Story 1

- [X] T008 [P] [US1] Expandir `api/src/config/env.ts` com `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`, `TRIAGE_INTERVAL_MS`, `AI_MODE`, `OPENAI_API_KEY`, `JWT_SECRET` e `DATABASE_URL` (compatível com testes unitários em `NODE_ENV=test` sem `.env`)
- [X] T009 [P] [US1] Atualizar `api/src/http/app.ts` para ler `CORS_ORIGIN` de `api/src/config/env.ts` suportando múltiplas origens separadas por vírgula
- [X] T010 [P] [US1] Atualizar `api/src/main.ts` para usar `env.PORT` e encerrar o servidor HTTP graciosamente em `SIGINT`/`SIGTERM`
- [X] T011 [P] [US1] Atualizar `api/src/jobs/triage-worker.ts` para tratar `SIGINT`/`SIGTERM` cancelando o timer e executando `prisma.$disconnect()`
- [X] T012 [P] [US1] Atualizar `web/vite.config.ts` para ler a porta de `process.env.VITE_PORT` (default `5173`)
- [X] T013 [US1] Implementar `scripts/up.sh` conforme `contracts/cli-interface.md` e `data-model.md`: configurar `core.hooksPath .githooks`, resolver e persistir `WorktreeInstanceState` (`INSTANCE_ID`, `COMPOSE_PROJECT_NAME`, `DB_NAME`, `DB_PORT`, `API_PORT`, `WEB_PORT`, `UPLOAD_DIR`) em `.balcao-env/state.env`, gerar `api/.env` e `web/.env.local`, executar `npm ci` condicional em `api/` e `web/`, subir Postgres + `prisma generate` + `prisma migrate deploy` + `npm run seed`, iniciar API/worker/front em background registrando `ProcessPidRecord.PID` em `.balcao-env/pids/`, aguardar saúde e imprimir o resumo obrigatório

**Checkpoint**: `npm run up` sobe o Balcão completo do zero em uma única execução.

---

## Phase 4: User Story 2 - Reexecução idempotente da subida (Priority: P1)

**Goal**: Rodar `npm run up` novamente sem derrubar antes funciona sem erro, mantém serviços saudáveis, recupera processos caídos e não duplica usuários nem chamados da seed.

**Independent Test**: Executar `npm run up` duas vezes consecutivas, verificar exit code 0, login com as 3 contas e contagem exata de 3 usuários e 3 chamados iniciais no banco.

### Implementation for User Story 2

- [X] T014 [US2] Refatorar `api/prisma/seed.ts` para idempotência completa conforme `SeedDataset` em `data-model.md`: usar `prisma.user.upsert` por `User.email` (`update: {}`) e verificar existência prévia dos 3 chamados iniciais por `(Ticket.customerId, Ticket.title)` antes de criar chamado e respostas
- [X] T015 [US2] Consolidar idempotência em `scripts/up.sh`: recarregar `.balcao-env/state.env`, reaproveitar container Postgres em execução e serviços com `ProcessPidRecord.PID` saudável, reiniciar apenas processos caídos e evitar `npm ci` redundante via stamp do lockfile

**Checkpoint**: Reexecutar `npm run up` repetidas vezes é rápido, seguro e não duplica dados.

---

## Phase 5: User Story 3 - Execução simultânea de múltiplas cópias isoladas (Priority: P1)

**Goal**: Duas worktrees sobem simultaneamente com portas, container/banco, pasta de anexos e worker completamente distintos, cada front falando apenas com sua própria API e suíte `blackbox/` passando em ambas.

**Independent Test**: Subir `copia-a` e `copia-b` simultaneamente, validar isolamento de chamados/triagem/anexos nas duas interfaces web e passar `blackbox/` contra ambas.

### Implementation for User Story 3

- [X] T016 [US3] Revisar e blindar detecção de portas ocupadas e isolamento em `scripts/up.sh` e `scripts/lib/env-utils.sh` para garantir que uma segunda worktree nunca reutilize portas de outra cópia, vincule `web/.env.local` (`VITE_API_URL`) e `api/.env` (`CORS_ORIGIN`) exclusivamente às próprias portas e crie `WorktreeInstanceState.UPLOAD_DIR` exclusivo em `<worktree>/.balcao-env/uploads`

**Checkpoint**: Duas worktrees simultâneas operam de forma totalmente independente.

---

## Phase 6: User Story 4 - Derrubada isolada de uma cópia (Priority: P2)

**Goal**: `npm run down` encerra exclusivamente os processos (front, worker, API) e o container Postgres iniciados pela cópia atual, sem afetar outras worktrees, permitindo subir novamente sem erro.

**Independent Test**: Com `copia-a` e `copia-b` no ar, rodar `npm run down` em `copia-b`, confirmar `/api/health` de `copia-a` respondendo `200`, subir `copia-b` de novo e derrubar ambas.

### Implementation for User Story 4

- [X] T017 [US4] Implementar `scripts/down.sh` conforme `contracts/cli-interface.md`: carregar `.balcao-env/state.env`, encerrar de forma segura apenas os processos de `ProcessPidRecord.PID` (`web`, `worker`, `api`) e seus filhos, executar `docker compose -p "$COMPOSE_PROJECT_NAME" down`, limpar `.balcao-env/pids/` e retornar código 0 mesmo quando a cópia já estiver parada

**Checkpoint**: Ciclo completo `up → up → worktree up → down → up → down` funcionando sem efeitos colaterais.

---

## Phase 7: Polish & Validação Ponta a Ponta

**Purpose**: Verificar ausência de regressões, estado limpo do Git e todos os critérios de aceite do `quickstart.md`.

- [X] T018 Executar testes unitários da API (`cd api && npm test`) sem `.env` e confirmar que `git status` permanece limpo (sem lockfiles alterados nem arquivos efêmeros untracked) após `npm run up`
- [ ] T019 Executar todos os cenários de `specs/001-ambiente-isolado/quickstart.md`: subida limpa, 2ª subida idempotente, worktree paralela `copia-b`, verificação visual no navegador (login, triagem <= 15s e anexo isolado) via subagente `browser`, suíte `blackbox/` contra ambas as cópias, derrubada isolada de `copia-b` preservando `copia-a`, nova subida de `copia-b` e limpeza final da worktree temporária

---

## Dependencies & Execution Order

- **Phase 1 (T001–T003)**: Sem dependências; `T002` e `T003` em paralelo com `T001`.
- **Phase 2 (T004–T007)**: Todos `[P]` em paralelo; bloqueiam `T013`–`T017`.
- **Phase 3 (T008–T013)**: `T008`–`T012` em paralelo; `T013` depende de `T002`–`T012`.
- **Phase 4 (T014–T015)**: `T014` independente; `T015` refina `T013`.
- **Phase 5 (T016)** e **Phase 6 (T017)**: Dependem de `T004`–`T006` e `T013` (`T017` pode ser escrito em paralelo a `T016`).
- **Phase 7 (T018–T019)**: Validação final após `T001`–`T017`.

## Strategy for Subagents & Context Control

- **Implementação (`T001`–`T017`)**: Delegar a 1 subagente `self` focado (ou 2 em paralelo separando ajustes em `api/`+`web/` de `scripts/`+`docker-compose.yml`+`package.json`), mantendo leituras detalhadas fora da conversa principal.
- **Validação de UI (`T019`)**: Delegar o teste interativo do front nas duas worktrees ao subagente `browser`.
- **Marco pós-Feature 001**: Após commit limpo na `main`, recomendar `/compact` antes de iniciar a Spec `002-gates-e-hooks`.
