# Balcão Harness Constitution

## Core Principles

### I. Preservação Estrita do Contrato (NON-NEGOTIABLE)

O foco exclusivo deste projeto é o harness de engenharia para agentes — nunca novas features ou mudanças de comportamento no Balcão. Rotas HTTP, payloads, códigos de status, códigos de erro, contas da seed (`admin@balcao.dev`, `agente@balcao.dev`, `cliente@balcao.dev`) e o modo de IA padrão (`AI_MODE=fake`, sem necessidade de chave) NÃO PODEM mudar. A suíte caixa-preta (`blackbox/`) do repositório base é o contrato soberano de regressão.

### II. Isolamento Total por Worktree e Idempotência

Múltiplas cópias do repositório (ex.: `git worktree`) DEVEM rodar simultaneamente sem compartilhar porta, banco de dados, pasta de anexos nem processo worker. Cada cópia utiliza container Postgres dedicado (`COMPOSE_PROJECT_NAME` + porta dinâmica livre), portas dinâmicas para API e front, `CORS_ORIGIN` e `VITE_API_URL` vinculados à própria cópia, e pasta de anexos exclusiva. O comando raiz `npm run up` DEVE inicializar tudo a partir de um clone limpo, ser idempotente em execuções repetidas (sem erro nem duplicação da seed) e ativar o hook Git sem passos manuais extras. O comando `npm run down` DEVE encerrar apenas os recursos iniciados pela cópia atual, sem afetar outras worktrees.

### III. Gates Determinísticos Primeiro, Zero Supressões (NON-NEGOTIABLE)

As invariantes obrigatórias `G1` a `G10` do enunciado e as regras próprias `G11` (`@prisma/client` restrito a `api/src/repositories/`) e `G12` (proibição de `fetch` direto em `web/src/pages/` e `web/src/components/`) DEVEM ser implementadas antes da refatoração do código legado e orquestradas por um único comando raiz (`npm run gates`). O comando NÃO PODE parar na primeira falha e DEVE emitir uma linha por violação contendo o ID da regra e o caminho do arquivo (além do nome do pacote em dependência sem uso), saindo com código diferente de zero em qualquer falha. Comentários de supressão (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`) em `api/src/` e `web/src/`, bem como exclusões indevidas de arquivos nas ferramentas de gate, são estritamente proibidos. Um hook `pre-commit` DEVE bloquear commits com erros de tipo ou lint.

### IV. Integridade Estrutural e Restrições de Stack

As pastas e arquivos de entrada fixos (`api/src/main.ts`, `api/src/config/`, `api/src/domain/`, `api/src/http/`, `api/src/services/`, `api/src/repositories/`, `api/src/integrations/`, `api/src/jobs/triage-worker.ts`, `web/src/`, `web/src/main.tsx` e o padrão `api/src/**/*.test.ts`) NÃO PODEM ser movidos nem renomeados. A stack (Express, Prisma, Postgres, React, Vite) e a execução do worker em processo separado da API são imutáveis. Todos os scripts de ambiente, hooks e gates DEVEM funcionar apenas com Linux ou macOS, Bash, Docker, Git e Node.js LTS, usando `npm ci` para preservar os lockfiles existentes.

### V. Documentação Verificável e Aprendizado Contínuo do Harness

O arquivo `AGENTS.md` na raiz DEVE ter no máximo 60 linhas e atuar como índice enxuto com progressive disclosure; todos os comandos e caminhos nele citados DEVEM existir e funcionar. `CLAUDE.md` DEVE apontar para `AGENTS.md`. O `README.md` DEVE cobrir todas as seções do entregável (como rodar, contas da seed, tabela de gates + exemplos das regras próprias, decisões técnicas e link para incidentes). Erros reais cometidos por agentes durante o trabalho DEVEM gerar mudanças concretas no harness (gate, hook, script ou documentação) e ser registrados em `docs/incidentes.md` (mínimo 3 entradas) com o hash real do commit da correção.

### VI. Execução por Specs com Controle de Contexto

O trabalho é dividido em 4 specs sequenciais no GitHub Spec Kit (`001-ambiente-isolado`, `002-gates-e-hooks`, `003-refatoracao-invariantes`, `004-docs-e-incidentes`), mantidas versionadas na branch `main` junto com `.specify/` e `.agents/`. Para evitar degradação por janela de contexto cheia, o agente principal atua como orquestrador leve, delegando auditorias e blocos de implementação a subagentes com contexto isolado (`invoke_subagent` e `run_workflow`), e realizando compactação (`/compact`) ou abertura de nova sessão entre marcos relevantes.

## Restrições Técnicas e Invariantes do Harness

- **Interface CLI raiz (`package.json`)**:
  - `npm run up` → delega para `scripts/up.sh`
  - `npm run down` → delega para `scripts/down.sh`
  - `npm run gates` → delega para `scripts/gates.sh`
- **Catálogo completo de invariantes**:
  - `G1`: Zero erro de tipo TypeScript em `api/` e `web/`.
  - `G2`: Lint sem erro e sem warning em `api/` e `web/` (mínimo: variável/import sem uso e `any` explícito).
  - `G3`: Testes unitários da API (`api/src/**/*.test.ts`) passam sem banco de dados.
  - `G4`: Nada em `api/src/http/` importa `@prisma/client` nem módulos de `api/src/repositories/`.
  - `G5`: `process.env` só em `api/src/config/`; `import.meta.env` só em `web/src/config/`.
  - `G6`: Nada em `api/src/services/` importa `express`, `multer` ou módulos de `api/src/http/` (inclusive `import type`).
  - `G7`: Pacote `openai` só importado em `api/src/integrations/`.
  - `G8`: Nada em `web/` importa arquivos de `api/` (inclusive `import type`).
  - `G9`: Nenhum import circular em `api/src/` nem em `web/src/` (inclusive arquivos órfãos).
  - `G10`: Nenhum arquivo sem uso, export sem uso (inclusive tipos) ou dependência declarada sem uso em `api/` e `web/`.
  - `G11` *(própria)*: `@prisma/client` só é importado em `api/src/repositories/` (inclusive `import type`).
  - `G12` *(própria)*: `fetch` direto proibido em `web/src/pages/` e `web/src/components/` (chamadas HTTP passam por `web/src/api/`).
- **Exemplos de violação próprios**: cada regra própria (`G11`, `G12`) DEVE possuir exemplo de violação versionado fora de `api/src/` e `web/src/`, com instrução reproduzível no `README.md`.

## Fluxo de Desenvolvimento e Portões de Qualidade

1. Cada pilar segue o ciclo Spec Kit: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → validação contra critérios do avaliador.
2. Nenhuma spec é dada como concluída sem evidência executável:
   - Spec 001: 2 worktrees simultâneas + reexecução idempotente de `npm run up` + `blackbox/` passando nas duas + `npm run down` isolado.
   - Spec 002: `npm run gates` executando todas as regras sem short-circuit, hook `pre-commit` instalado via `npm run up` e exemplos de `G11`/`G12` prontos.
   - Spec 003: `npm run gates` passando na `main`, `bash kit-gates/verificar.sh . "npm run gates"` 100% `barrada`, exemplos de `G11`/`G12` barrados, `git grep` sem supressões e `blackbox/` verde.
   - Spec 004: passos 1 a 11 do Fluxo do Avaliador verificados em clone limpo + 2 worktrees.
3. Os arquivos `.specify/`, `.agents/` e `specs/` permanecem versionados na `main` para manter `git status` limpo e rastreabilidade do processo SDD.

## Governance

Esta constituição tem precedência sobre quaisquer práticas ad-hoc ou instruções legadas (incluindo o `CLAUDE.md` original). Alterações exigem justificativa explícita, atualização da versão semântica abaixo (MAJOR para remoção/redefinição incompatível de princípio, MINOR para novo princípio ou expansão material, PATCH para clarificações) e revisão de impacto nos artefatos ativos em `specs/`. Todas as revisões de plano (`Constitution Check`) e validações de implementação DEVEM verificar conformidade com os princípios I a VI.

**Version**: 1.0.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-26
