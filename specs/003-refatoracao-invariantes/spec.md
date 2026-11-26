# Feature Specification: Refatoração Completa das Invariantes (G1–G12)

**Feature Branch**: `003-refatoracao-invariantes`

**Created**: 2026-11-26

**Status**: Approved

**Input**: User description: "Refatorar integralmente o código legado em `api/` e `web/` para zerar todas as violações de G1 a G12 apontadas por `npm run gates`, preservando 100% do contrato HTTP e comportamental validado por `blackbox/`, sem comentários de supressão e sem mover pastas fixas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conformidade integral do frontend (`web/`) com G1, G2, G5, G8, G9, G10 e G12 (Priority: P1)

Como mantenedor do harness, quero que toda a aplicação `web/` passe nos gates `G1`, `G2`, `G5`, `G8`, `G9`, `G10` e `G12` com zero erros, zero warnings e zero supressões, mantendo exatamente o mesmo fluxo de telas, chamadas HTTP, autenticação e mensagens de interface.

**Why this priority**: O frontend concentra violações acopladas ao backend (`G8` importando `api/src/domain/ticket`), acesso direto a `import.meta.env` (`G5`), `fetch` direto em página (`G12`), `any` explícito e warning de `react-hooks` (`G2`) além de dependência e exports mortos (`G10`). Isolar e limpar `web/` primeiro elimina acoplamento cross-workspace sem depender da refatoração interna de `api/`.

**Independent Test**: Executar `tsc -p web/tsconfig.json --noEmit`, `npm run build` em `web/`, `eslint --max-warnings 0 "web/src/**/*.{ts,tsx}"`, `depcruise web/src --config .dependency-cruiser.cjs` e `knip --workspace web` obtendo 0 violações; validar na UI/fluxo caixa-preta que login, listagem, criação, detalhamento, upload/download de anexos e estatísticas continuam idênticos.

**Acceptance Scenarios**:

1. **Given** `web/src/config/env.ts` centralizando `VITE_API_URL`, **When** ESLint (`G5`) é executado sobre `web/src/`, **Then** nenhum outro arquivo em `web/src/` acessa `import.meta.env`.
2. **Given** `web/src/types/ticket.ts` declarando os tipos de domínio locais do frontend, **When** `dependency-cruiser` (`G8`) é executado, **Then** nada em `web/` importa arquivos de `api/` (inclusive `import type`).
3. **Given** `downloadAttachment` em `web/src/api/tickets.ts` substituindo o `fetch` direto em `TicketDetailPage.tsx`, **When** ESLint (`G12`) é executado, **Then** nenhuma página ou componente em `web/src/pages/` ou `web/src/components/` invoca `fetch` diretamente.
4. **Given** eliminação de `err: any`, correção de `react-hooks/exhaustive-deps` em `StatsPage.tsx`, remoção de `formatCurrency`, redução de visibilidade de tipos/classes internos e desinstalação de `axios`, **When** `G1`, `G2` e `G10` rodam em `web/`, **Then** há 0 erros, 0 warnings e 0 código/dependência morta.

---

### User Story 2 - Conformidade arquitetural, de qualidade e código morto do backend (`api/`) (Priority: P1)

Como mantenedor do harness, quero que toda a API e worker em `api/` passem integralmente em `G1`, `G2`, `G3`, `G4`, `G5`, `G6`, `G7`, `G9`, `G10` e `G11`, eliminando acoplamentos entre camadas (`http/` → `repositories/`, `services/` → `http/`/`express`/`multer`, `http/` → `openai`, `jobs/` → `@prisma/client`) e ciclos entre serviços, mantendo 100% dos testes unitários e do contrato HTTP.

**Why this priority**: O backend possui 43 das 55 violações iniciais de `npm run gates`, incluindo violações estruturais críticas (`G4`, `G6`, `G7`, `G9`, `G11`) e `lodash`/exports mortos (`G10`).

**Independent Test**: Executar `npm run gates` após a refatoração de `api/` e confirmar saída `0` (`Gates OK (G1–G12): 0 violações`), além de rodar a suíte unitária (`vitest`) e a suíte `blackbox/` com todos os testes passando.

**Acceptance Scenarios**:

1. **Given** rotas em `api/src/http/routes/` refatoradas para delegar persistência e chamadas de IA exclusivamente a `api/src/services/`, **When** `G4` e `G7` são verificados, **Then** nada em `api/src/http/` importa `@prisma/client`, `api/src/repositories/` ou `openai`.
2. **Given** `api/src/services/` desacoplado de `express`, `multer` e `api/src/http/` (usando DTOs/erros de domínio ou camada de serviço próprios), e sem ciclo entre `ticket-service.ts` e `notification-service.ts`, **When** `G6`, `G9` e `G3` são verificados, **Then** há zero violações de fronteira ou ciclos e todos os testes unitários (`api/src/**/*.test.ts`) passam sem banco de dados.
3. **Given** `api/src/jobs/triage-worker.ts` usando exclusivamente repositórios/serviços e `api/src/config/env.ts` centralizando todo acesso a `process.env`, **When** `G5` e `G11` são verificados, **Then** apenas `api/src/config/` lê `process.env` e apenas `api/src/repositories/` importa `@prisma/client`.
4. **Given** remoção de `lodash` de `api/`, eliminação de arquivos/exports/tipos mortos (`legacy-sla.ts`, símbolos não utilizados em `domain/`, `http/`, `integrations/`, `repositories/`, `services/`) e substituição de `any`/variáveis não usadas, **When** `G1`, `G2` e `G10` são verificados, **Then** não restam violações em `api/`.

---

### User Story 3 - Preservação integral do contrato HTTP, ausência de supressões e validação ponta a ponta (Priority: P1)

Como avaliador do desafio, quero confirmar que o repositório final passa simultaneamente em `npm run gates`, `kit-gates/verificar.sh`, `kit-gates-proprios/verificar.sh`, verificação de ausência de supressões e na suíte caixa-preta (`blackbox/`) sem alteração alguma de rotas, payloads, códigos HTTP, seeds ou regras de negócio.

**Why this priority**: Garante que a refatoração não quebrou nenhum comportamento observável do Balcão nem mascarou invariantes com supressões ou exclusões.

**Independent Test**: Executar em worktree limpa `npm run up`, `npm run gates`, `bash kit-gates/verificar.sh . "npm run gates"`, `bash kit-gates-proprios/verificar.sh . "npm run gates"`, busca por comentários de supressão e suíte `blackbox/`.

**Acceptance Scenarios**:

1. **Given** o repositório completo após refatoração de `web/` e `api/`, **When** `npm run gates` é executado, **Then** todas as invariantes `G1`–`G12` passam com código `0`.
2. **Given** `git grep` em `api/src/` e `web/src/` buscando `eslint-disable`, `@ts-ignore`, `@ts-expect-error` e `@ts-nocheck`, **When** executado, **Then** nenhuma ocorrência é encontrada.
3. **Given** o ambiente inicializado via `npm run up`, **When** a suíte `blackbox/` é executada, **Then** 100% dos cenários caixa-preta passam sem modificação na suíte `blackbox/`.

---

### Edge Cases

- Tipos do domínio no frontend (`TicketStatus`, `TicketCategory`, `TicketPriority`, `TriageStatus`) devem permanecer idênticos aos literais do backend para evitar divergência de serialização JSON.
- A remoção de `export` em tipos ou classes internos (`ApiError`, `User`, `Ticket`, `Reply` no `web/` ou símbolos equivalentes na `api/`) não pode quebrar a checagem `tsc --noEmit` nem o build Vite/Node.
- O tratamento de erros em chamadas de `services/` na `api/` deve mapear para os mesmos códigos HTTP (`400`, `401`, `403`, `404`, `409`, `500`) e formato `{ error, message }` esperados pela suíte `blackbox/`.
- A desinstalação de dependências mortas (`axios` em `web/`, `lodash` em `api/`) deve atualizar apenas os respectivos `package.json` e `package-lock.json` via `npm uninstall`, mantendo as demais versões intactas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo acesso a `import.meta.env` em `web/src/` MUST residir exclusivamente em `web/src/config/env.ts` (`G5`), e todo acesso a `process.env` em `api/src/` MUST residir exclusivamente em `api/src/config/env.ts` (`G5`).
- **FR-002**: `web/` MUST definir seus próprios tipos compartilhados de ticket em `web/src/types/ticket.ts` sem importar nenhum arquivo de `api/` (`G8`).
- **FR-003**: Chamadas `fetch` em `web/` MUST residir apenas em `web/src/api/`, removendo o `fetch` direto de `web/src/pages/TicketDetailPage.tsx` para `downloadAttachment` em `web/src/api/tickets.ts` (`G12`).
- **FR-004**: `api/src/http/` MUST NOT importar `@prisma/client` nem módulos de `api/src/repositories/` (`G4`), nem importar `openai` (`G7`).
- **FR-005**: `api/src/services/` MUST NOT importar `express`, `multer` ou módulos de `api/src/http/` (`G6`).
- **FR-006**: `@prisma/client` MUST ser importado apenas em `api/src/repositories/` (`G11`).
- **FR-007**: `api/src/` e `web/src/` MUST NOT conter ciclos de dependência (`G9`), mantendo-se sem circularidade inclusive entre `ticket-service.ts` e `notification-service.ts`.
- **FR-008**: Todo código em `api/src/` e `web/src/` MUST compilar sem erros TypeScript (`G1`), passar no ESLint com `--max-warnings 0` sem `any` explícito, sem variáveis/imports não usados e sem warnings de `react-hooks` (`G2`), e não conter arquivos, exports, tipos ou dependências declaradas sem uso (`G10`), incluindo a remoção de `axios` em `web/` e `lodash` em `api/`.
- **FR-009**: Nenhum comentário de supressão (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`) pode ser inserido em `api/src/` ou `web/src/`, e nenhuma pasta/arquivo fixo definido pela Constituição pode ser movido ou renomeado.
- **FR-010**: Todos os testes unitários em `api/src/**/*.test.ts` MUST passar sem banco de dados (`G3`), e toda a suíte `blackbox/` MUST passar preservando integralmente o contrato HTTP e o comportamento da aplicação.

### Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run gates` retorna código `0` (`Gates OK (G1–G12): 0 violações`), zerando todas as 55 violações levantadas no estado legado.
- **SC-002**: `bash kit-gates/verificar.sh . "npm run gates"` e `bash kit-gates-proprios/verificar.sh . "npm run gates"` reportam 100% das violações esperadas como barradas e deixam a árvore limpa ao final.
- **SC-003**: Busca por `eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck` em `api/src/` e `web/src/` retorna 0 ocorrências.
- **SC-004**: A suíte `blackbox/` passa integralmente sobre o ambiente subido com `npm run up`, sem qualquer alteração nos arquivos de `blackbox/`.

## Assumptions

- Os gates configurados na Spec 002 (`eslint.config.mjs`, `.dependency-cruiser.cjs`, `knip.json`, `scripts/lib/run-gates.mjs`) permanecem a definição autoritativa das invariantes `G1`–`G12` e não devem ser relaxados.
- `api/` e `web/` já possuem suas dependências instaladas (ou são restauráveis via `npm ci`), e `npm uninstall` é usado estritamente para remover as dependências mortas `axios` (`web/`) e `lodash` (`api/`).
