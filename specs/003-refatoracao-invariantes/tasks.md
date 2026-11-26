---
description: "Task list for Feature 003: Refatoração Completa das Invariantes (G1–G12)"
---

# Tasks: Refatoração Completa das Invariantes (G1–G12)

**Input**: Design documents from `/specs/003-refatoracao-invariantes/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `quickstart.md`

**Organization**: Dividida em Fase 1 (Artefatos Spec 003 + Refatoração `web/` — US1), Fase 2 (Refatoração `api/` — US2) e Fase 3 (Validação Integral — US3).

---

## Phase 1: User Story 1 - Refatoração do Frontend (`web/`) & Artefatos Spec 003

**Purpose**: Documentar a Spec 003 e zerar 100% das violações `G1`, `G2`, `G5`, `G8`, `G9`, `G10` e `G12` em `web/` sem alterar comportamento de UI ou contratos HTTP.

- [X] T001 Atualizar `.specify/feature.json` para `specs/003-refatoracao-invariantes` e criar artefatos (`spec.md`, `checklists/requirements.md`, `plan.md`, `research.md`, `quickstart.md`, `tasks.md`)
- [X] T002 [P] [US1] Criar `web/src/config/env.ts` centralizando `VITE_API_URL` (`G5`) e atualizar `web/src/api/client.ts` e `web/src/api/tickets.ts` para usar `env.apiUrl`
- [X] T003 [P] [US1] Criar `web/src/types/ticket.ts` com `TicketStatus`, `TicketCategory`, `TicketPriority`, `TriageStatus` e remover imports de `api/src/domain/ticket` em `web/src/api/tickets.ts` e `web/src/pages/TicketDetailPage.tsx` (`G8`)
- [X] T004 [US1] Extrair `downloadAttachment` para `web/src/api/tickets.ts` e remover `fetch` direto e `import.meta.env` de `web/src/pages/TicketDetailPage.tsx` (`G12`, `G5`)
- [X] T005 [P] [US1] Substituir `err: any` por `err: unknown` com `getErrorMessage` em `LoginPage.tsx`, `NewTicketPage.tsx`, `RegisterPage.tsx`, `StatsPage.tsx`, `TicketsPage.tsx` e `TicketDetailPage.tsx`, e corrigir `react-hooks/exhaustive-deps` em `StatsPage.tsx` (`G2`)
- [X] T006 [P] [US1] Remover `formatCurrency` de `web/src/utils/format.ts`, remover `export` de símbolos internos não importados externamente (`ApiError`, `User`, `Ticket`, `Reply`) e rodar `npm uninstall axios` em `web/` (`G10`)
- [X] T007 [US1] Validar `web/` com `tsc --noEmit`, `vite build`, `eslint --max-warnings 0`, `depcruise` e `knip --workspace web`

---

## Phase 2: User Story 2 - Refatoração do Backend (`api/`)

**Purpose**: Zerar todas as violações `G1`–`G11` em `api/` preservando integralmente o contrato HTTP e os testes unitários.

- [X] T008 [P] [US2] Centralizar variáveis de ambiente restantes em `api/src/config/env.ts` e remover `process.env` de `http/middlewares/auth.ts`, `http/routes/tickets.ts`, `integrations/ai-client.ts`, `jobs/triage-worker.ts` e `services/attachment-service.ts` (`G5`)
- [X] T009 [P] [US2] Extrair classe/tipos de erro de domínio em `api/src/domain/` e remover dependências de `express`, `multer` e `api/src/http/` de `api/src/services/` e seus testes (`G6`)
- [X] T010 [US2] Quebrar import circular entre `api/src/services/notification-service.ts` e `api/src/services/ticket-service.ts` (`G9`)
- [X] T011 [US2] Desacoplar `api/src/http/routes/` (`attachments.ts`, `auth.ts`, `health.ts`, `stats.ts`, `tickets.ts`) de `@prisma/client`, `api/src/repositories/` e `openai`, delegando tudo via `api/src/services/` (`G4`, `G7`)
- [X] T012 [US2] Refatorar `api/src/jobs/triage-worker.ts` para não importar `@prisma/client` diretamente, consumindo repositórios/serviços (`G11`)
- [X] T013 [US2] Corrigir tipos/lint (`G2`) em `http/`, `repositories/` e `services/` (sem `any` explícito, sem variáveis/imports não usados)
- [X] T014 [US2] Remover `api/src/utils/legacy-sla.ts`, remover `lodash` via `npm uninstall lodash` em `api/`, e eliminar/internalizar exports sem uso em `domain/`, `http/`, `integrations/`, `repositories/` e `services/` (`G10`)
- [X] T015 [US2] Validar `api/` com `tsc --noEmit`, `vitest run` (`G3`), `eslint --max-warnings 0`, `depcruise` e `knip --workspace api`

---

## Phase 3: User Story 3 - Validação Integral e Contrato Caixa-Preta

**Purpose**: Confirmar conformidade ponta a ponta de todo o repositório após as duas frentes.

- [X] T016 [US3] Executar `npm run gates` na raiz e confirmar saída `0` (`Gates OK (G1–G12): 0 violações`)
- [X] T017 [US3] Executar `bash kit-gates/verificar.sh . "npm run gates"` e `bash kit-gates-proprios/verificar.sh . "npm run gates"` confirmando 100% de detecção
- [X] T018 [US3] Verificar ausência total de comentários de supressão (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`) em `api/src/` e `web/src/`
- [X] T019 [US3] Subir ambiente via `npm run up`, executar a suíte `blackbox/` garantindo 100% de aprovação e encerrar com `npm run down`
