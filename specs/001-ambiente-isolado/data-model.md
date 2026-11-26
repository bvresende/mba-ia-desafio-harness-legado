# Data Model: Ambiente Isolado e Idempotente por Cópia

## 1. WorktreeInstanceState (`.balcao-env/state.env`)

Estado local efêmero (ignorado no Git) persistido em formato `KEY=VALUE` por cópia do repositório.

| Field | Type / Format | Constraints | Description |
|---|---|---|---|
| `INSTANCE_ID` | string | Regex `^balcao-[a-z0-9-]+-[0-9a-f]{8}$`, determinístico por `pwd -P` | Identificador único da cópia |
| `COMPOSE_PROJECT_NAME` | string | Igual a `INSTANCE_ID` | Namespace isolado do Docker Compose (container, rede e volume) |
| `DB_NAME` | string | Regex `^balcao_[0-9a-f]{8}$` | Nome do database dentro do Postgres dedicado da cópia |
| `DB_PORT` | integer | `1024..65535`, distinto de `API_PORT` e `WEB_PORT` | Porta host mapeada para Postgres `5432` |
| `API_PORT` | integer | `1024..65535`, distinto de `DB_PORT` e `WEB_PORT` | Porta HTTP da API Express |
| `WEB_PORT` | integer | `1024..65535`, distinto de `DB_PORT` e `API_PORT` | Porta HTTP do servidor Vite |
| `UPLOAD_DIR` | absolute path | `<repo-root>/.balcao-env/uploads`, criado com `mkdir -p` | Pasta exclusiva de anexos da cópia |

### Transições de estado

1. **Ausente (clone limpo)** → `npm run up` gera `INSTANCE_ID`, aloca portas livres, grava `state.env`, `api/.env` e `web/.env.local`, sobe DB + API + worker + front.
2. **Em execução (saudável)** → `npm run up` carrega `state.env`, preserva portas/processos saudáveis, reaplica migrations e seed idempotente, garante todos os 3 processos vivos e imprime o resumo.
3. **Degradado (1+ processos caídos)** → `npm run up` reutiliza as portas de `state.env` (se livres) ou realoca se ocupadas externamente, reinicia apenas o que está parado e valida saúde.
4. **Qualquer estado** → `npm run down` encerra os PIDs registrados em `.balcao-env/pids/` (API, worker, front), executa `docker compose -p "$COMPOSE_PROJECT_NAME" down` e limpa arquivos de PID (mantendo uploads/estado seguro para nova subida).

## 2. ProcessPidRecord (`.balcao-env/pids/{api,worker,web}.pid`)

| Field | Type / Format | Constraints | Description |
|---|---|---|---|
| `PID` | positive integer | Processo ativo no SO iniciado pela cópia atual | PID raiz do processo em segundo plano (`api`, `worker` ou `web`) |

## 3. SeedDataset (`api/prisma/seed.ts`)

Não altera o `schema.prisma`; define a invariante de idempotência sobre as entidades existentes `User`, `Ticket` e `Reply`.

- **Users (upsert por `User.email` único)**:
  - `admin@balcao.dev` (`Admin`, role `admin`, senha `Admin@123`)
  - `agente@balcao.dev` (`Ana Atendente`, role `agent`, senha `Agente@123`)
  - `cliente@balcao.dev` (`Carlos Cliente`, role `customer`, senha `Cliente@123`)
- **Tickets iniciais (idempotência por `(Ticket.customerId, Ticket.title)`)**:
  1. `"Não consigo emitir a segunda via do boleto"` (`status: open`, `triageStatus: pending`, 0 respostas)
  2. `"Erro ao salvar o perfil"` (`status: in_progress`, `category: technical`, `priority: medium`, `triageStatus: done`, 1 resposta inicial)
  3. `"Dúvida sobre troca de senha"` (`status: resolved`, `category: account`, `priority: low`, `triageStatus: done`, 2 respostas iniciais)
