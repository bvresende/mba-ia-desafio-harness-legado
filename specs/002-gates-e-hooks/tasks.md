---
description: "Task list for Feature 002: Gates Determinísticos e Hooks de Qualidade"
---

# Tasks: Gates Determinísticos e Hooks de Qualidade

**Input**: Design documents from `/specs/002-gates-e-hooks/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `contracts/gates-output.md`, `quickstart.md`

**Tests**: Execução de `npm run gates` contra o legado (verificação de não curto-circuito e detecção multi-regra), testes de sanidade específicos (`import type` G6/G8, ciclo órfão G9, `left-pad` G10, G11/G12) e teste do hook `pre-commit` com reversão de arquivos temporários.

**Organization**: Tarefas organizadas por fase e User Story (`US1`–`US4`).

---

## Phase 1: Setup & Bootstrap Integration

**Purpose**: Instalar ferramentas de gate na raiz sem tocar nos lockfiles de `api/` e `web/`, expor `npm run gates` e integrar o bootstrap em `scripts/up.sh`.

- [X] T001 Instalar `devDependencies` na raiz (`eslint@^9`, `@eslint/js@^9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `dependency-cruiser`, `knip`) preservando `api/package-lock.json` e `web/package-lock.json`
- [X] T002 Adicionar script `"gates": "bash scripts/gates.sh"` no `package.json` raiz
- [X] T003 Atualizar `scripts/up.sh` para chamar `ensure_npm_ci "$REPO_ROOT"` garantindo dependências da raiz instaladas em clone limpo
- [X] T004 Garantir presença de `api/node_modules` e `web/node_modules` via `npm ci` quando ausentes

---

## Phase 2: Gate Configurations (G1–G12)

**Purpose**: Configurar ferramentas estáticas cobrindo 100% de `api/src/` e `web/src/` sem supressões nem exclusões indevidas.

- [X] T005 [P] Criar `eslint.config.mjs` (ESLint 9 flat config) cobrindo `G2` (`no-unused-vars`, `no-explicit-any`, `react-hooks`), `G5` (`process.env` fora de `api/src/config/**`, `import.meta.env` fora de `web/src/config/**`) e `G12` (`fetch` direto proibido em `web/src/pages/**` e `web/src/components/**`)
- [X] T006 [P] Criar `.dependency-cruiser.cjs` cobrindo `G4`, `G6` (com `import type`), `G7`, `G8` (com `import type`), `G9` (ciclos) e `G11` (`@prisma/client` restrito a `api/src/repositories/`)
- [X] T007 [P] Criar `knip.json` com workspaces `api` e `web` para `G10` (arquivos sem uso, exports/tipos sem uso e dependências declaradas sem uso)

---

## Phase 3: User Story 1 & 2 - Orquestrador Sem Curto-Circuito e Hook `pre-commit`

**Purpose**: Orquestrar `G1`–`G12` em um único comando raiz e conectar o hook `.githooks/pre-commit` aos gates de tipo e lint.

- [X] T008 [US1] Implementar `scripts/lib/run-gates.mjs` executando G1 (`tsc`), G2/G5/G12 (`eslint`), G3 (`vitest`), G4/G6/G7/G8/G9/G11 (`depcruise`) e G10 (`knip`) sem parar na primeira falha, suportando `--pre-commit` (G1 + G2) e imprimindo linhas deduplicadas `<ID> <arquivo> ...`
- [X] T009 [P] [US1] Criar `scripts/gates.sh` (`chmod +x`) invocando `scripts/lib/run-gates.mjs`
- [X] T010 [P] [US2] Criar `scripts/pre-commit.sh` (`chmod +x`) invocando `scripts/lib/run-gates.mjs --pre-commit` e confirmar integração em `.githooks/pre-commit`

---

## Phase 4: User Story 3 - Exemplos Versionados das Regras Próprias (`kit-gates-proprios/`)

**Purpose**: Versionar casos reproduzíveis para `G11` e `G12` fora de `api/src/` e `web/src/`.

- [X] T011 [P] [US3] Criar violação `kit-gates-proprios/violacoes/G11-prisma-no-servico/` (`manifesto` + `arquivos/api/src/services/consulta-direta.ts.modelo`)
- [X] T012 [P] [US3] Criar violação `kit-gates-proprios/violacoes/G12-fetch-na-pagina/` (`manifesto` + `arquivos/web/src/pages/ResumoDiretoPage.tsx.modelo`)
- [X] T013 [US3] Criar `kit-gates-proprios/verificar.sh` (`chmod +x`) para validar automaticamente `G11` e `G12`

---

## Phase 5: User Story 4 & Validação Completa

**Purpose**: Validar detecção real no legado e testes de sanidade em casos críticos antes do commit.

- [X] T014 Executar `npm run gates` contra o legado atual e confirmar que todas as verificações rodam até o fim apontando violações reais (`G2`, `G4`, `G5`, `G6`, `G7`, `G8`, `G10`, `G11`, `G12`) sem alterar `api/src/` ou `web/src/`
- [X] T015 Executar testes de sanidade temporários (e revertê-los ao fim) para `G6`/`G8` (`import type`), `G9` (ciclo órfão), `G10` (`left-pad` no `package.json` sem `npm install` + export morto), `G11`, `G12` e hook `pre-commit` (`G1` e `G2`)
- [X] T016 Conferir `git status` limpo de lockfiles de `api/`/`web/` e arquivos efêmeros, marcar todas as tarefas como `[X]` e realizar commit na `main`
