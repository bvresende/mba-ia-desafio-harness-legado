# Implementation Plan: Refatoração Completa das Invariantes (G1–G12)

**Branch**: `003-refatoracao-invariantes` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-refatoracao-invariantes/spec.md`

## Summary

Zerar todas as 55 violações reportadas por `npm run gates` sobre o código legado do Balcão, dividindo a execução em duas frentes independentes:
1. **Frontend (`web/`)**: centralizar `import.meta.env` em `web/src/config/env.ts` (`G5`), desacoplar tipos de ticket de `api/` via `web/src/types/ticket.ts` (`G8`), mover download de anexos para `web/src/api/tickets.ts` (`G12`), eliminar `any` explícitos e warning de `react-hooks/exhaustive-deps` (`G2`), além de remover `formatCurrency`, exports internos desnecessários e a dependência `axios` (`G10`).
2. **Backend (`api/`)**: centralizar `process.env` em `api/src/config/env.ts` (`G5`), isolar `@prisma/client` em `api/src/repositories/` (`G4`, `G11`), isolar `openai` em `api/src/integrations/` (`G7`), remover acoplamentos de `express`/`multer`/`http` em `api/src/services/` (`G6`), quebrar ciclo entre `ticket-service.ts` e `notification-service.ts` (`G9`), eliminar `any` explícitos e variáveis sem uso (`G2`), remover código/exports mortos e `lodash` (`G10`), mantendo `vitest` (`G3`) e `blackbox/` 100% verdes.

## Technical Context

**Language/Version**: TypeScript 5.9 (`api/` e `web/`), Node.js LTS (>= 22), React 19 + Vite 8 (`web/`), Express + Prisma 6 (`api/`)

**Primary Dependencies**: Existentes em `api/package.json` (removendo `lodash`) e `web/package.json` (removendo `axios`); ferramental de gate na raiz (ESLint 9, `dependency-cruiser`, `knip`, `tsc`, `vitest`)

**Storage**: PostgreSQL (via Prisma exclusivamente em `api/src/repositories/`, usado em runtime e validado por `blackbox/`; testes unitários `G3` sem banco)

**Testing**: `npm run gates` (`G1`–`G12`), `tsc --noEmit`, `vite build`, `vitest run` (`G3`), `bash kit-gates/verificar.sh . "npm run gates"`, `bash kit-gates-proprios/verificar.sh . "npm run gates"` e suíte `blackbox/`

**Target Platform**: Linux e macOS (ambiente local / worktree isolado via `npm run up`)

**Project Type**: Monorepo com `api/` (API HTTP + worker) e `web/` (SPA React)

**Performance Goals**: Sem regressão de build, startup ou tempo de execução de `npm run gates`

**Constraints**: Preservação estrita do contrato HTTP (`blackbox/` inalterado); zero supressões (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`); nenhuma pasta/arquivo fixo movido ou renomeado; sem alterar regras de gate (`eslint.config.mjs`, `.dependency-cruiser.cjs`, `knip.json`, `scripts/`)

**Scale/Scope**: 12 violações iniciais em `web/` (`G2`, `G5`, `G8`, `G10`, `G12`) e 43 violações iniciais em `api/` (`G2`, `G4`, `G5`, `G6`, `G7`, `G9`, `G10`, `G11`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Preservação Estrita do Contrato**: PASS — Todos os endpoints, payloads, códigos de status, mensagens de erro, seeds e `AI_MODE=fake` são preservados; a suíte `blackbox/` permanece inalterada como oráculo final.
- **II. Isolamento Total por Worktree e Idempotência**: PASS — Variáveis de ambiente continuam lidas dinamicamente a partir de `api/src/config/env.ts` e `web/src/config/env.ts`, preservando compatibilidade com portas e `VITE_API_URL` por worktree.
- **III. Gates Determinísticos Primeiro, Zero Supressões**: PASS — A refatoração adapta o código às regras `G1`–`G12` já implantadas na Spec 002, sem alterar configurações de gate e sem inserir supressões.
- **IV. Integridade Estrutural e Restrições de Stack**: PASS — Nenhuma pasta fixa (`api/src/main.ts`, `config/`, `domain/`, `http/`, `services/`, `repositories/`, `integrations/`, `jobs/triage-worker.ts`, `web/src/`, `web/src/main.tsx`, `api/src/**/*.test.ts`) é movida ou renomeada; `axios` e `lodash` são removidos apenas por serem dependências declaradas sem uso (`G10`).
- **V. Documentação Verificável e Aprendizado Contínuo**: PASS — Artefatos Spec Kit em `specs/003-refatoracao-invariantes/` e rastreabilidade via `.specify/feature.json`.
- **VI. Execução por Specs com Controle de Contexto**: PASS — Execução particionada em duas metades independentes (`web/` + artefatos Spec 003 primeiro; `api/` + validação global na sequência).

## Project Structure

### Documentation (this feature)

```text
specs/003-refatoracao-invariantes/
├── spec.md
├── checklists/
│   └── requirements.md
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```

### Source Code (affected areas)

```text
web/
├── package.json                       # Remoção de axios (G10)
├── package-lock.json                  # Atualizado por npm uninstall axios
└── src/
    ├── config/env.ts                  # Novo: centraliza VITE_API_URL (G5)
    ├── types/ticket.ts                # Novo: union types de ticket locais ao front (G8)
    ├── api/
    │   ├── client.ts                  # Usa env.apiUrl; ApiError interno (G5, G10)
    │   ├── auth.ts                    # User interno se não exportado externamente (G10)
    │   └── tickets.ts                 # Usa env.apiUrl + types/ticket + downloadAttachment (G5, G8, G12)
    ├── utils/
    │   └── format.ts                  # Remove formatCurrency (G10); helper getErrorMessage (G2)
    └── pages/
        ├── LoginPage.tsx              # err: unknown (G2)
        ├── NewTicketPage.tsx          # err: unknown (G2)
        ├── RegisterPage.tsx           # err: unknown (G2)
        ├── StatsPage.tsx              # deps useEffect + err: unknown (G2)
        ├── TicketsPage.tsx            # err: unknown (G2)
        └── TicketDetailPage.tsx       # Usa types/ticket, downloadAttachment, err: unknown (G2, G5, G8, G12)

api/
├── package.json                       # Remoção de lodash (G10)
├── package-lock.json                  # Atualizado por npm uninstall lodash
└── src/
    ├── config/env.ts                  # Centraliza todas as variáveis process.env (G5)
    ├── domain/                        # Erros de domínio / tipos sem imports proibidos (G6, G10)
    ├── repositories/                  # Único ponto de @prisma/client; interfaces & implementações (G4, G10, G11)
    ├── integrations/                  # Único ponto de openai e leitura via config/env (G5, G7, G10)
    ├── services/                      # Regras de negócio sem Express/Multer/Http e sem ciclos (G2, G3, G6, G9, G10)
    ├── jobs/triage-worker.ts          # Usa config/env e repositories/services sem @prisma/client direto (G5, G11)
    ├── http/                          # Rotas e middlewares delegando a services sem repositories/Prisma/openai (G2, G4, G5, G7, G10)
    └── utils/legacy-sla.ts            # Removido: arquivo morto (G10)
```

**Structure Decision**: Manter exatamente a árvore fixa de pastas e apenas adicionar os módulos necessários dentro das camadas existentes (`web/src/config/`, `web/src/types/`), eliminando arquivos/exports mortos sem mover entrypoints.

## Complexity Tracking

Nenhuma violação à Constituição identificada.
