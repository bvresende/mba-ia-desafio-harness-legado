# Implementation Plan: Ambiente Isolado e Idempotente por Cópia

**Branch**: `001-ambiente-isolado` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ambiente-isolado/spec.md`

## Summary

Implementar o Pilar 1 do harness do Balcão: comandos raiz `npm run up` (`scripts/up.sh`) e `npm run down` (`scripts/down.sh`) que sobem e derrubam todo o ambiente (Postgres dedicado por worktree, migrações, seed idempotente, API Express, worker de triagem e front React/Vite) de forma autônoma, idempotente e 100% isolada entre múltiplas cópias simultâneas, ativando automaticamente o hook Git (`.githooks`) e preservando intacto o contrato HTTP validado pela suíte `blackbox/`.

## Technical Context

**Language/Version**: Bash (POSIX/Bash 3.2+ compatível com Linux e macOS), Node.js LTS (>= 22), TypeScript 5.9 (`api/` e `web/`)

**Primary Dependencies**: Docker + `docker compose`, Git, npm (`npm ci`), Express 4, Prisma 6, Postgres 16, React 19, Vite 8, Zod 4, `tsx`

**Storage**: Postgres 16 em container dedicado por worktree (`COMPOSE_PROJECT_NAME` + volume isolado por projeto + database nomeado por cópia); anexos em filesystem local isolado (`<repo>/.balcao-env/uploads`)

**Testing**: Vitest unitário (`api/src/**/*.test.ts`), suíte caixa-preta oficial (`blackbox/` via `API_URL=... npm test`), teste manual/automatizado com 2 worktrees simultâneas + verificação de UI no browser

**Target Platform**: Linux e macOS (sem dependências além de Bash, Docker, Git e Node.js LTS)

**Project Type**: Full-stack web service (`api/` + worker + `web/`) + CLI operacional de harness (`package.json` raiz + `scripts/`)

**Performance Goals**: Subida em clone limpo sem intervenção manual; reexecução idempotente sem reinstalar dependências nem reiniciar serviços já saudáveis; triagem fake concluída em <= 15s (intervalo padrão `2000ms`)

**Constraints**: Preservar contrato HTTP exato, contas da seed, IA em modo `fake` por padrão, todas as pastas/entradas fixas e lockfiles sem mutação (`npm ci`); manter `git status` limpo após `npm run up`

**Scale/Scope**: 2+ worktrees simultâneas na mesma máquina sem conflito de porta, container/banco, volume, pasta de anexos ou processo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Preservação Estrita do Contrato**: PASS — Nenhuma rota, payload, status, conta da seed ou modo fake alterado; suíte `blackbox/` validada em ambas as cópias.
- **II. Isolamento Total por Worktree e Idempotência**: PASS — Container Postgres dedicado por cópia (`COMPOSE_PROJECT_NAME` + `DB_PORT` + `DB_NAME` únicos), portas dinâmicas para API/front, `UPLOAD_DIR` exclusivo em `.balcao-env/uploads`, seed idempotente sem duplicação, `npm run down` restrito à cópia atual.
- **III. Gates Determinísticos Primeiro, Zero Supressões**: PASS — Todo código novo/alterado em `api/` e `web/` nesta feature já evita `any`, variáveis não usadas e `process.env` fora de `config/`; `.githooks/pre-commit` já é ativado por `npm run up` e será conectado aos gates completos na Spec 002.
- **IV. Integridade Estrutural e Restrições de Stack**: PASS — Nenhuma pasta ou entrada fixa movida/renomeada; worker permanece processo separado; apenas Bash, Docker, Git e Node.js LTS usados; instalação via `npm ci`.
- **V. Documentação Verificável e Aprendizado Contínuo**: PASS — `quickstart.md` documenta comandos reais; quaisquer incidentes reais encontrados durante a execução serão anotados para `docs/incidentes.md` (Spec 004).
- **VI. Execução por Specs com Controle de Contexto**: PASS — Implementação delegada a subagente com contexto limpo e validação visual delegada ao subagente `browser`.

*Re-check pós-Phase 1*: PASS — Todos os contratos, scripts e modelo de estado em `.balcao-env/` atendem integralmente aos 6 princípios.

## Project Structure

### Documentation (this feature)

```text
specs/001-ambiente-isolado/
├── plan.md              # Plano de implementação (este arquivo)
├── research.md          # Decisões técnicas e alternativas avaliadas
├── data-model.md        # Entidades de estado da instância e seed idempotente
├── quickstart.md        # Guia de validação ponta a ponta (1 cópia + 2 worktrees)
├── contracts/
│   └── cli-interface.md # Contrato CLI de npm run up / npm run down e variáveis geradas
└── tasks.md             # Lista de tarefas (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                        # Novo: expõe scripts raiz "up" e "down" (e futuro "gates")
.gitignore                          # Atualizado: ignora .balcao-env/, .env.local, .env.*.local
.githooks/
└── pre-commit                      # Novo: hook versionado ativado por scripts/up.sh
docker-compose.yml                  # Atualizado: porta dinâmica ${DB_PORT:-5432}, DB ${POSTGRES_DB:-balcao}, healthcheck
scripts/
├── up.sh                           # Novo: subida única, idempotente e isolada por cópia
├── down.sh                         # Novo: derrubada isolada da cópia atual
└── lib/
    ├── env-utils.sh                # Novo: helpers de slug/hash, PID/process-tree, health checks
    └── find-port.mjs               # Novo: alocador portátil de portas livres (Node.js)
api/
├── .env.example                    # Atualizado: inclui CORS_ORIGIN mantendo defaults compatíveis
├── prisma/
│   └── seed.ts                     # Atualizado: upsert de usuários + criação idempotente dos 3 tickets
└── src/
    ├── config/
    │   └── env.ts                  # Atualizado: PORT, CORS_ORIGIN, UPLOAD_DIR, TRIAGE_INTERVAL_MS, DATABASE_URL
    ├── http/
    │   └── app.ts                  # Atualizado: CORS dinâmico via env.CORS_ORIGIN (suporta múltiplas origens)
    ├── main.ts                     # Atualizado: usa env.PORT e encerra servidor em SIGINT/SIGTERM
    └── jobs/
        └── triage-worker.ts        # Atualizado: shutdown gracioso em SIGINT/SIGTERM (clearTimeout + $disconnect)
web/
└── vite.config.ts                  # Atualizado: porta dinâmica via VITE_PORT (default 5173)
```

**Structure Decision**: Mantém 100% da estrutura original de `api/` e `web/` (respeitando todas as pastas fixas), adiciona apenas a camada de orquestração raiz (`package.json`, `scripts/`, `.githooks/`) e ajustes pontuais de configuração/idempotência nos entrypoints existentes.

## Complexity Tracking

Nenhuma violação à Constituição identificada.
