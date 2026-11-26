# AGENTS.md — Balcão

Central de chamados (`api/`, `web/`, `blackbox/`). IA roda em modo `fake` por padrão.
Contrato HTTP imutável: não altere rotas, payloads, status nem a suíte `blackbox/`.

## Comandos principais

- Subir ambiente isolado (Postgres, migrations, seed, API, worker, front, hooks): `npm run up`
- Derrubar apenas esta cópia: `npm run down`
- Rodar todos os gates (`G1`–`G12`): `npm run gates`
- Validar gates oficiais: `bash kit-gates/verificar.sh . "npm run gates"`
- Validar regras próprias (`G11`, `G12`): `bash kit-gates-proprios/verificar.sh . "npm run gates"`

## Contas da seed

| Papel | E-mail | Senha |
|---|---|---|
| admin | `admin@balcao.dev` | `Admin@123` |
| atendente | `agente@balcao.dev` | `Agente@123` |
| cliente | `cliente@balcao.dev` | `Cliente@123` |

## Regras de camada e invariantes (`G1`–`G12`)

- **Tipos e lint (`G1`, `G2`, `G3`)**: zero erro TS, zero warning ESLint (`any` e não usados proibidos), `api/src/**/*.test.ts` passando sem banco.
- **Env (`G5`)**: `process.env` só em `api/src/config/`; `import.meta.env` só em `web/src/config/`.
- **Fronteiras API (`G4`, `G6`, `G7`, `G11`)**: `api/src/http/` não importa `@prisma/client`, `api/src/repositories/` nem `openai`; `api/src/services/` não importa `express`, `multer` nem `api/src/http/` (inclusive `import type`); `openai` só em `api/src/integrations/`; `@prisma/client` só em `api/src/repositories/`.
- **Fronteiras Web (`G8`, `G12`)**: `web/` não importa `api/` (nem `import type`); `fetch` proibido em `web/src/pages/` e `web/src/components/` (usar `web/src/api/`).
- **Ciclos e código morto (`G9`, `G10`)**: zero ciclos em `api/src/` e `web/src/`; zero arquivo, export, tipo ou dependência sem uso.
- **Integridade**: zero supressões (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`). Não mova nem renomeie pastas/entradas fixas: `api/src/main.ts`, `api/src/config/`, `api/src/domain/`, `api/src/http/`, `api/src/services/`, `api/src/repositories/`, `api/src/integrations/`, `api/src/jobs/triage-worker.ts`, `web/src/`, `web/src/main.tsx`.

## Onde está o detalhe

- Uso humano, pré-requisitos e decisões do projeto: `README.md`
- Especificação, ferramentas e formato dos gates `G1`–`G12`: `docs/gates.md`
- Registro de incidentes reais e mudanças no harness: `docs/incidentes.md`
- Funcionamento do kit de verificação dos gates: `kit-gates/README.md`
