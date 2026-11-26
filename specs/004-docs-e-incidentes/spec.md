# Feature Specification: Documentação Verificável e Registro de Incidentes

**Feature Branch**: `004-docs-e-incidentes`

**Created**: 2026-11-26

**Status**: Approved

**Input**: User description: "Executar a Spec 004 (`004-docs-e-incidentes`): criar `AGENTS.md` enxuto (<= 60 linhas), substituir `CLAUDE.md` legado por ponteiro para `AGENTS.md`, documentar todos os gates (`G1`–`G12`) em `docs/gates.md`, registrar 3 incidentes reais em `docs/incidentes.md` com hashes reais que mexem no harness (`0f30651`, `68b8c9b`, `16cbc80`), reescrever `README.md` com todas as seções do entregável, validar comandos/caminhos e commitar na `main`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Índice enxuto e confiável para agentes (`AGENTS.md` e `CLAUDE.md`) (Priority: P1)

Como agente de código abrindo o repositório pela primeira vez, quero encontrar um `AGENTS.md` na raiz com no máximo 60 linhas contendo comandos reais, contas da seed, regras de camada (`G1`–`G12`) e ponteiros para os documentos detalhados, e um `CLAUDE.md` curto que apenas aponte para o `AGENTS.md`.

**Why this priority**: Substitui as instruções legadas contraditórias e garante progressive disclosure sem inflar o contexto inicial de novos agentes.

**Independent Test**: Executar `wc -l AGENTS.md` (<= 60), inspecionar `CLAUDE.md` apontando para `AGENTS.md`, verificar no disco todos os caminhos citados e executar todos os comandos listados em `AGENTS.md`.

**Acceptance Scenarios**:

1. **Given** o arquivo `AGENTS.md` na raiz, **When** `wc -l AGENTS.md` é executado, **Then** a contagem de linhas é menor ou igual a 60.
2. **Given** todos os comandos e caminhos citados em `AGENTS.md`, **When** cada caminho é verificado e cada comando é executado, **Then** todos existem no disco e funcionam sem erro.
3. **Given** o arquivo `CLAUDE.md` na raiz, **When** lido por um agente, **Then** não repete regras conflitantes do legado e aponta diretamente para `AGENTS.md` (e `README.md`).

---

### User Story 2 - Documentação técnica de gates e registro de incidentes (`docs/gates.md` e `docs/incidentes.md`) (Priority: P1)

Como mantenedor ou avaliador do harness, quero consultar `docs/gates.md` para entender a ferramenta, configuração e formato de saída de cada regra `G1`–`G12` (com motivação das regras próprias `G11` e `G12`), e consultar `docs/incidentes.md` com pelo menos 3 incidentes reais ocorridos durante a construção do harness e seus respectivos commits de correção.

**Why this priority**: Consolida o detalhe técnico fora do `AGENTS.md` e comprova o ciclo de aprendizado contínuo do harness com rastreabilidade no histórico Git.

**Independent Test**: Conferir em `docs/gates.md` as 12 regras, ferramentas, configurações e motivações de `G11`/`G12`; executar `git show --stat` para cada hash em `docs/incidentes.md` (`0f30651`, `68b8c9b`, `16cbc80`) confirmando existência no histórico e alteração no harness.

**Acceptance Scenarios**:

1. **Given** `docs/gates.md`, **When** revisado contra `eslint.config.mjs`, `.dependency-cruiser.cjs`, `knip.json` e `scripts/lib/run-gates.mjs`, **Then** todas as regras `G1`–`G12`, suas ferramentas, exceções e o formato de saída coincidem exatamente com a implementação real.
2. **Given** `docs/incidentes.md`, **When** `git show --stat <hash>` é executado para cada entrada (`0f30651`, `68b8c9b`, `16cbc80`), **Then** todos os commits existem na branch `main` e alteram arquivos do harness.

---

### User Story 3 - Guia completo para humanos no `README.md` (Priority: P1)

Como avaliador ou pessoa desenvolvedora clonando o repositório, quero um `README.md` na raiz com as 5 seções obrigatórias do entregável: como rodar, contas da seed, tabela de gates (`G1`–`G12`) + reprodução dos exemplos de violação de `G11`/`G12`, decisões de engenharia e link para o registro de incidentes.

**Why this priority**: Atende integralmente à seção **Entregável** de `ENUNCIADO.md` e orienta o fluxo do avaliador (inclusive aplicação manual e automatizada de `kit-gates-proprios/`).

**Independent Test**: Conferir a presença das 5 seções no `README.md`, validar a reprodução dos exemplos de `G11` e `G12` conforme instruído e executar `npm run gates`.

**Acceptance Scenarios**:

1. **Given** o `README.md` na raiz, **When** comparado ao `ENUNCIADO.md`, **Then** contém pré-requisitos, comandos `npm run up`/`npm run down`/`npm run gates`, saída esperada da subida, tabela das contas da seed, tabela completa `G1`–`G12`, instruções para testar `G11` e `G12` (via `kit-gates-proprios/verificar.sh` e manualmente com os `.modelo`), decisões técnicas (isolamento, refatoração e documentação) e link para `docs/incidentes.md`.

---

### Edge Cases

- Nenhum arquivo de `api/src/` ou `web/src/` precisa ser modificado nesta spec; as pastas e entradas fixas permanecem intactas.
- Os comandos de teste manual das violações `G11` e `G12` descritos no `README.md` devem desfazer os arquivos temporários ao término para não sujar o repositório.
- O `AGENTS.md` não pode ultrapassar 60 linhas nem citar comandos ou caminhos inexistentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `AGENTS.md` na raiz MUST ter no máximo 60 linhas (`wc -l AGENTS.md <= 60`), atuando como índice com comandos (`npm run up`, `npm run down`, `npm run gates`, `bash kit-gates/verificar.sh . "npm run gates"`, `bash kit-gates-proprios/verificar.sh . "npm run gates"`), as 3 contas da seed, regras de camada e invariantes (`G1`–`G12`), e ponteiros para `README.md`, `docs/gates.md`, `docs/incidentes.md` e `kit-gates/README.md`.
- **FR-002**: Todos os comandos e caminhos citados em `AGENTS.md` MUST existir e funcionar no estado atual do repositório.
- **FR-003**: `CLAUDE.md` na raiz MUST substituir integralmente o conteúdo legado e apontar para `AGENTS.md` (e `README.md`) sem repetir nem contradizer regras.
- **FR-004**: `docs/gates.md` MUST documentar `G1`–`G10` e as regras próprias `G11` e `G12`, informando ferramenta, configuração, exceções, motivações reais (`triage-worker.ts` para `G11`, `TicketDetailPage.tsx` para `G12`), formato de saída e uso dos kits de verificação.
- **FR-005**: `docs/incidentes.md` MUST registrar 3 incidentes reais ocorridos no desenvolvimento do harness com o que aconteceu, a mudança no harness que impede a repetição e o hash real de cada commit (`0f30651`, `68b8c9b`, `16cbc80`).
- **FR-006**: `README.md` na raiz MUST ser reescrito cobrindo as 5 seções obrigatórias do entregável: Como rodar, Contas da seed, Gates (incluindo aplicação automatizada e manual das violações `G11` e `G12`), Decisões (isolamento de worktrees, refatoração do legado e documentação) e link para `docs/incidentes.md`.
- **FR-007**: A feature MUST atualizar `.specify/feature.json` e manter os artefatos `specs/004-docs-e-incidentes/{spec.md,checklists/requirements.md,plan.md,tasks.md}` versionados na `main` com commit passando normalmente pelo hook `pre-commit`.

### Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `wc -l AGENTS.md` retorna `<= 60`.
- **SC-002**: `git show --stat 0f30651`, `git show --stat 68b8c9b` e `git show --stat 16cbc80` retornam exit code `0` e mostram alterações no harness.
- **SC-003**: Todos os caminhos listados em `AGENTS.md` existem no disco e `npm run gates` passa com código `0`.
- **SC-004**: Commit final na `main` passa pelo hook `pre-commit` sem `--no-verify`.
