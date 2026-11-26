# Balcão

Central de chamados com API (Express + Prisma + Postgres), worker de triagem em segundo plano e front (React + Vite), preparada para desenvolvimento paralelo por agentes em múltiplas worktrees isoladas e protegida por gates determinísticos.

- `api/`: API HTTP e worker de triagem (`api/src/jobs/triage-worker.ts`).
- `web/`: aplicação React + Vite.
- `blackbox/`: suíte caixa-preta que valida o contrato HTTP da API.
- `scripts/`, `kit-gates/`, `kit-gates-proprios/`, `docs/`: automação de ambiente, gates e documentação do harness.

---

## Como rodar

### Pré-requisitos

- Linux ou macOS
- Bash
- Docker com `docker compose`
- Git
- Node.js >= 22 (LTS)

### Comandos principais

Na raiz do repositório:

- **Subir o ambiente completo** (instala dependências com `npm ci` quando necessário, configura o hook `.githooks`, sobe um Postgres dedicado, aplica migrations, roda a seed idempotente e inicia API, worker e front):
  ```bash
  npm run up
  ```
- **Derrubar apenas a cópia atual** (encerra front, worker, API e o container Postgres desta worktree, sem afetar outras cópias):
  ```bash
  npm run down
  ```
- **Rodar todos os gates (`G1`–`G12`)**:
  ```bash
  npm run gates
  ```

### O que a subida informa

Ao concluir com sucesso, `npm run up` imprime os dados isolados da cópia atual:

```text
Balcão no ar!
Instância:  balcao-<slug>-<hash>
API:        http://localhost:<porta-api>
Front:      http://localhost:<porta-web>
Banco:      postgresql://balcao:balcao@localhost:<porta-db>/<db_name> (container: balcao-<slug>-<hash>)
Anexos:     <caminho-da-copia>/.balcao-env/uploads
IA:         fake (sem chave)
```

Rodar `npm run up` novamente sem derrubar antes é idempotente: reutiliza os serviços já saudáveis da cópia e reaplica migrations/seed sem erro nem duplicação.

---

## Contas da seed

A seed (`api/prisma/seed.ts`) cria de forma idempotente as três contas usadas pela aplicação e pela suíte `blackbox/`:

| Papel | E-mail | Senha |
|---|---|---|
| admin | `admin@balcao.dev` | `Admin@123` |
| atendente | `agente@balcao.dev` | `Agente@123` |
| cliente | `cliente@balcao.dev` | `Cliente@123` |

---

## Gates

O comando `npm run gates` executa todas as verificações sem parar na primeira falha e lista uma linha por violação no formato `<ID> <arquivo>`. O hook `pre-commit` (`.githooks/pre-commit`, ativado automaticamente por `npm run up`) bloqueia commits com falhas de tipo (`G1`) ou lint (`G2`).

| ID | Regra | Ferramenta |
|---|---|---|
| `G1` | Zero erro de tipo TypeScript em `api/` e `web/`. | `tsc` |
| `G2` | Lint sem erro e sem warning em `api/` e `web/` (inclui não usados e `any` explícito). | `eslint` |
| `G3` | Testes unitários da API (`api/src/**/*.test.ts`) passam sem banco. | `vitest` |
| `G4` | Nada em `api/src/http/` importa `@prisma/client` nem `api/src/repositories/`. | `dependency-cruiser` |
| `G5` | `process.env` só em `api/src/config/`; `import.meta.env` só em `web/src/config/`. | `eslint` |
| `G6` | Nada em `api/src/services/` importa `express`, `multer` ou `api/src/http/` (inclusive `import type`). | `dependency-cruiser` |
| `G7` | O pacote `openai` só é importado em `api/src/integrations/`. | `dependency-cruiser` |
| `G8` | Nada em `web/` importa arquivos de `api/` (inclusive `import type`). | `dependency-cruiser` |
| `G9` | Nenhum import circular em `api/src/` nem em `web/src/`. | `dependency-cruiser` |
| `G10` | Nenhum arquivo, export/tipo ou dependência declarada sem uso em `api/` e `web/`. | `knip` |
| `G11` | *(Própria)* `@prisma/client` só é importado em `api/src/repositories/` (inclusive `import type`). | `dependency-cruiser` |
| `G12` | *(Própria)* `fetch` direto proibido em `web/src/pages/` e `web/src/components/`. | `eslint` |

Para validar as invariantes oficiais `G1`–`G10` com o kit do repositório:

```bash
bash kit-gates/verificar.sh . "npm run gates"
```

### Motivação das regras próprias (`G11` e `G12`)

- **`G11`**: no legado, `api/src/jobs/triage-worker.ts` criava seu próprio `PrismaClient` diretamente, furando a camada de repositórios (a `G4` só cobria `api/src/http/`). Restringir `@prisma/client` a `api/src/repositories/` centraliza a conexão em `prisma.ts` e preserva desacoplamento e testabilidade.
- **`G12`**: no legado, `web/src/pages/TicketDetailPage.tsx` fazia `fetch` direto no download de anexos, duplicando URL base e header `Authorization` fora de `web/src/api/`. Proibir `fetch`, `window.fetch` e `globalThis.fetch` em `pages/` e `components/` garante cliente HTTP único em `web/src/api/`.

Detalhes completos das configurações estão em [`docs/gates.md`](./docs/gates.md).

### Como testar os exemplos de violação das regras próprias (`G11` e `G12`)

**Via verificador automatizado** (planta cada violação `.modelo`, confere saída com ID + arquivo e restaura o repositório limpo):

```bash
bash kit-gates-proprios/verificar.sh . "npm run gates"
```

**Aplicação manual de cada exemplo**:

1. **Testar `G11`** (`@prisma/client` importado em serviço):
   ```bash
   cp kit-gates-proprios/violacoes/G11-prisma-no-servico/arquivos/api/src/services/consulta-direta.ts.modelo api/src/services/consulta-direta.ts
   npm run gates
   rm api/src/services/consulta-direta.ts
   ```
   A saída de `npm run gates` falha listando `G11 api/src/services/consulta-direta.ts`.

2. **Testar `G12`** (`fetch` direto em página React):
   ```bash
   cp kit-gates-proprios/violacoes/G12-fetch-na-pagina/arquivos/web/src/pages/ResumoDiretoPage.tsx.modelo web/src/pages/ResumoDiretoPage.tsx
   npm run gates
   rm web/src/pages/ResumoDiretoPage.tsx
   ```
   A saída de `npm run gates` falha listando `G12 web/src/pages/ResumoDiretoPage.tsx`.

---

## Decisões

### Isolamento de cópias (worktrees)

- **Identidade por diretório físico**: `compute_instance_vars` (`scripts/lib/env-utils.sh`) calcula um hash SHA-256 de `pwd -P` para derivar `INSTANCE_ID`, `COMPOSE_PROJECT_NAME` e `DB_NAME` exclusivos por cópia.
- **Postgres e portas dedicadas**: cada worktree sobe seu próprio container Postgres via `docker compose -p "$COMPOSE_PROJECT_NAME"` usando portas livres alocadas por `scripts/lib/find-port.mjs` para banco, API e front.
- **Anexos e configuração por cópia**: anexos gravam em `.balcao-env/uploads` dentro da própria cópia (`UPLOAD_DIR`); `scripts/up.sh` gera `api/.env` (com `PORT`, `CORS_ORIGIN` apontando para a porta do front da cópia e `AI_MODE=fake`) e `web/.env.local` (com `VITE_API_URL` e `VITE_PORT`).
- **Processos desacoplados e seed idempotente**: API, worker e Vite sobem via `spawn_detached` (`detached: true` + `unref()`), sobrevivem à saída do shell e são encerrados apenas por `scripts/down.sh` via PIDs em `.balcao-env/pids/`. A seed usa `upsert` nos usuários e `ensureTicket` para evitar duplicações em subidas repetidas.
- **Hook automático**: `scripts/up.sh` executa `git config core.hooksPath .githooks`, ativando o `pre-commit` sem passos extras.

### Correção das violações legadas (sem supressões)

- **Backend (`api/`)**:
  - `AppError` foi extraído para `api/src/domain/errors.ts` e o container de dependências para `api/src/composition/container.ts`, removendo imports de `express`, `multer` e `api/src/http/` de `api/src/services/` (`G6`).
  - Foram criados repositórios dedicados (`health-repository.ts`, `stats-repository.ts`, `triage-repository.ts`) e serviços correspondentes (`health-service.ts`, `stats-service.ts`, `triage-service.ts`) para que rotas em `api/src/http/routes/` e o job `api/src/jobs/triage-worker.ts` nunca importem `@prisma/client` nem repositórios diretamente (`G4`, `G11`).
  - `suggestReply` passou por `TicketService` usando `api/src/integrations/ai-client.ts`, removendo `openai` de `api/src/http/routes/tickets.ts` (`G7`).
  - `formatTicketRef` foi movido para `api/src/domain/ticket.ts`, quebrando o ciclo entre `ticket-service.ts` e `notification-service.ts` (`G9`).
  - Todas as leituras de `process.env` foram centralizadas em `api/src/config/env.ts` (`G5`); `any` explícitos e variáveis não usadas foram eliminados (`G2`); e `api/src/utils/legacy-sla.ts`, exports sem uso e `lodash` foram removidos (`G10`).
- **Frontend (`web/`)**:
  - `web/src/config/env.ts` centraliza `VITE_API_URL` (`G5`) e `web/src/types/ticket.ts` define os tipos de ticket do front sem importar `api/` (`G8`).
  - `downloadAttachment` foi movido de `web/src/pages/TicketDetailPage.tsx` para `web/src/api/tickets.ts` (`G12`).
  - `err: any` foi substituído por `err: unknown` com `getErrorMessage` (`web/src/utils/format.ts`), as dependências do `useEffect` em `StatsPage.tsx` foram corrigidas (`G2`), e `formatCurrency`, exports internos ociosos e `axios` foram removidos (`G10`).

### Documentação para agentes

- O `CLAUDE.md` legado (desatualizado e contraditório) foi substituído por um ponteiro curto para [`AGENTS.md`](./AGENTS.md).
- `AGENTS.md` foi escrito como índice enxuto (<= 60 linhas) aplicando progressive disclosure: contém apenas comandos verificáveis, contas da seed, invariantes e links para [`README.md`](./README.md), [`docs/gates.md`](./docs/gates.md), [`docs/incidentes.md`](./docs/incidentes.md) e [`kit-gates/README.md`](./kit-gates/README.md).

---

## Registro de incidentes

Os incidentes reais encontrados durante o desenvolvimento do harness e as respectivas mudanças que impedem sua repetição estão documentados em [`docs/incidentes.md`](./docs/incidentes.md).
