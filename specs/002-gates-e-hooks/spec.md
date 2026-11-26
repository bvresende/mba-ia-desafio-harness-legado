# Feature Specification: Gates Determinísticos e Hooks de Qualidade

**Feature Branch**: `002-gates-e-hooks`

**Created**: 2026-11-26

**Status**: Approved

**Input**: User description: "Implementar o Pilar 2 (primeira metade: Gates e Hooks) do desafio Balcão: comando único `npm run gates` que executa todas as invariantes G1–G10 do enunciado e as 2 regras próprias G11 e G12 sem parar na primeira falha, emitindo uma linha por violação no formato `<ID> <caminho-relativo-do-arquivo> ...`, sem supressões nem exclusões indevidas; hook Git `pre-commit` ativado automaticamente por `npm run up`; e exemplos de violação versionados para G11 e G12 em `kit-gates-proprios/`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Execução completa e consolidada de todos os gates (Priority: P1)

Como desenvolvedor ou agente de código trabalhando no repositório, quero executar um único comando (`npm run gates`) que verifique todas as invariantes obrigatórias (`G1` a `G10`) e as duas regras próprias (`G11` e `G12`) de ponta a ponta sem parar na primeira falha, imprimindo ao final uma lista consolidada com uma linha por violação contendo o ID da regra e o arquivo afetado.

**Why this priority**: É o mecanismo central de enforcement do harness. Sem execução não-curto-circuitada e formato padronizado de saída, agentes não conseguem descobrir todas as violações de uma só vez nem ferramentas automatizadas (`kit-gates/verificar.sh`) validam os guardrails.

**Independent Test**: Executar `npm run gates` sobre o código legado atual e confirmar que o comando percorre todas as verificações até o fim, lista múltiplas categorias de violação simultaneamente (ex.: `G2`, `G4`, `G5`, `G6`, `G7`, `G8`, `G10`, `G11`, `G12`) com `<ID> <arquivo>` por linha e retorna código de saída diferente de zero.

**Acceptance Scenarios**:

1. **Given** um repositório contendo violações simultâneas de tipos, lint, arquitetura de camadas, código morto e regras próprias, **When** `npm run gates` é executado, **Then** todas as verificações (`G1`–`G12`) são executadas até o fim sem curto-circuito na primeira falha.
2. **Given** a conclusão das verificações com uma ou mais violações, **When** a saída final é lida, **Then** cada violação é impressa em uma linha contendo o ID da regra (`G1`..`G12`) e o caminho relativo do arquivo afetado (e, para dependência declarada sem uso na `G10`, o caminho `<api|web>/package.json` e o nome do pacote), retornando código de saída `1`.
3. **Given** um repositório em total conformidade com todas as invariantes, **When** `npm run gates` é executado, **Then** todas as verificações passam e o comando retorna código de saída `0`.

---

### User Story 2 - Bloqueio automático no hook pre-commit após subida (Priority: P1)

Como time mantendo o repositório com múltiplos agentes, quero que um hook `pre-commit` esteja ativo automaticamente após `npm run up` em qualquer clone limpo ou worktree e bloqueie commits que contenham erros de tipo (`G1`) ou violações de lint (`G2`).

**Why this priority**: Impede que agentes façam commits com regressões básicas de compilação ou qualidade de código, mesmo antes de rodarem a suíte completa de arquitetura.

**Independent Test**: Em um clone inicializado por `npm run up`, criar um arquivo com erro de tipo em `api/src/` e tentar commitar (bloqueado); repetir com uma variável não utilizada (bloqueado).

**Acceptance Scenarios**:

1. **Given** um clone limpo onde `npm run up` foi executado, **When** o usuário ou agente tenta commitar um arquivo contendo erro de tipo TypeScript (`G1`), **Then** o hook `.githooks/pre-commit` executa `scripts/pre-commit.sh` e bloqueia o commit com código de saída diferente de zero, indicando a violação `G1`.
2. **Given** um clone limpo onde `npm run up` foi executado, **When** o usuário ou agente tenta commitar um arquivo contendo variável ou import sem uso ou `any` explícito (`G2`), **Then** o hook bloqueia o commit com código de saída diferente de zero, indicando a violação `G2`.
3. **Given** um clone limpo após `npm run up` sem nenhum passo manual extra de instalação na raiz, **When** `.githooks/pre-commit` ou `npm run gates` é invocado, **Then** todas as ferramentas de gate instaladas na raiz já estão presentes em `node_modules/`.

---

### User Story 3 - Regras próprias G11 e G12 com exemplos versionados reproduzíveis (Priority: P1)

Como avaliador ou mantenedor do harness, quero que as duas regras próprias (`G11`: `@prisma/client` restrito a `api/src/repositories/`, e `G12`: proibição de `fetch` direto em `web/src/pages/` e `web/src/components/`) tenham exemplos de violação versionados fora de `api/src/` e `web/src/` e um script verificador que prove que ambas são barradas pelos gates.

**Why this priority**: Atende diretamente ao requisito do enunciado e da Constituição de possuir pelo menos duas regras próprias motivadas pelo domínio do Balcão com exemplos reproduzíveis.

**Independent Test**: Executar `bash kit-gates-proprios/verificar.sh . "npm run gates"` (ou testar individualmente cada violação de `kit-gates-proprios/violacoes/`) e confirmar que `G11` e `G12` são detectadas na mesma linha com o ID e o arquivo correspondente, desfazendo os arquivos temporários ao término.

**Acceptance Scenarios**:

1. **Given** a violação `G11-prisma-no-servico` aplicada em `api/src/services/consulta-direta.ts`, **When** os gates são executados, **Then** a saída contém uma linha com `G11` e `api/src/services/consulta-direta.ts` e o comando falha.
2. **Given** a violação `G12-fetch-na-pagina` aplicada em `web/src/pages/ResumoDiretoPage.tsx`, **When** os gates são executados, **Then** a saída contém uma linha com `G12` e `web/src/pages/ResumoDiretoPage.tsx` e o comando falha.

---

### User Story 4 - Integridade da cobertura e detecção de casos sutis (Priority: P2)

Como mantenedor do harness, quero garantir que nenhum arquivo de `api/src/` ou `web/src/` seja excluído indevidamente das ferramentas de gate e que casos sutis — como `import type` em `G6`/`G8`/`G11`, ciclos envolvendo arquivos órfãos em `G9`, e dependências ou exports/tipos sem uso em `G10` — sejam efetivamente detectados.

**Why this priority**: Regras mal configuradas deixam passar violações reais silenciosamente (falsos negativos) ou mascaram problemas com exclusões e supressões.

**Independent Test**: Plantar temporariamente casos sintéticos de `import type` (`G6` e `G8`), ciclo em arquivos não importados pelo entrypoint (`G9`), e dependência declarada sem instalação (`left-pad` no `package.json`) / export morto (`G10`), confirmando detecção com ID + arquivo exatos.

**Acceptance Scenarios**:

1. **Given** um arquivo em `api/src/services/` com `import type { Request } from 'express'` ou em `web/src/` com `import type ... from '../../api/src/...'`, **When** os gates são executados, **Then** `G6` e `G8` respectivamente são reportadas com o arquivo violador.
2. **Given** dois arquivos novos formando import circular sem estarem conectados ao `main.ts`/`main.tsx`, **When** os gates são executados, **Then** `G9` reporta ambos os arquivos do ciclo.
3. **Given** uma dependência adicionada apenas ao `package.json` de `api/` ou `web/` (ex.: `left-pad` sem `npm install`), **When** os gates são executados, **Then** `G10` reporta `<api|web>/package.json <dependencia> (dependência sem uso)`.

---

### Edge Cases

- Falha interna de uma ferramenta de gate (ex.: erro de sintaxe na configuração ou executável ausente) não deve ser interpretada como "zero violações"; o orquestrador deve reportar falha interna e retornar código diferente de zero.
- Arquivos de configuração `api/src/config/**` e `web/src/config/**` devem ser isentos apenas da regra `G5`, permanecendo integralmente verificados por `G1`, `G2`, `G3`, `G9`, `G10` e demais regras aplicáveis.
- Nenhum código de `api/src/` ou `web/src/` deve ser alterado nesta Spec 002 (a correção das violações legadas pertence exclusivamente à Spec 003), bem como `api/package-lock.json` e `web/package-lock.json` devem permanecer intactos.
- O hook `pre-commit` deve operar corretamente mesmo quando invocado via `core.hooksPath .githooks` em worktrees Git.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O `package.json` raiz MUST expor `"gates": "bash scripts/gates.sh"` e instalar as ferramentas de gate em `devDependencies` na raiz sem modificar `api/package-lock.json` nem `web/package-lock.json`.
- **FR-002**: `scripts/up.sh` MUST chamar `ensure_npm_ci "$REPO_ROOT"` para instalar as dependências da raiz em clones limpos sem intervenção manual, garantindo funcionamento imediato de `npm run gates` e `.githooks/pre-commit`.
- **FR-003**: O orquestrador de gates (`scripts/lib/run-gates.mjs` via `scripts/gates.sh`) MUST executar todas as verificações `G1` a `G12` sem curto-circuito na primeira falha e imprimir ao final uma lista consolidada e deduplicada com uma linha por violação no formato `<ID> <caminho-relativo-do-arquivo> ...`.
- **FR-004**: O gate `G1` MUST verificar tipos TypeScript em `api/` e `web/` com `tsc --noEmit --pretty false` e reportar `G1 <relpath>` para cada arquivo com erro.
- **FR-005**: Os gates `G2`, `G5` e `G12` MUST usar ESLint v9 (`eslint.config.mjs`) sobre `api/src/**/*.{ts,tsx}` e `web/src/**/*.{ts,tsx}` com `--max-warnings 0`, proibindo variáveis/imports sem uso e `any` explícito (`G2`), `process.env` fora de `api/src/config/**` e `import.meta.env` fora de `web/src/config/**` (`G5`), e `fetch`/`window.fetch`/`globalThis.fetch` em `web/src/pages/**` e `web/src/components/**` (`G12`).
- **FR-006**: O gate `G3` MUST executar os testes unitários da API (`vitest run --reporter=json` em `api/`) sem depender de banco de dados e reportar `G3 <relpath>` para cada arquivo de teste com falha.
- **FR-007**: Os gates `G4`, `G6`, `G7`, `G8`, `G9` e `G11` MUST usar `dependency-cruiser` (`.dependency-cruiser.cjs`) com suporte a `import type` (`tsPreCompilationDeps: true`) e análise completa de `api/src` e `web/src`, reportando todos os arquivos envolvidos (incluindo todos os nós em `api/src/` ou `web/src/` de cada ciclo na `G9`).
- **FR-008**: O gate `G10` MUST usar `knip` (`knip.json`) com workspaces `api` e `web` para detectar arquivos sem uso, exports e tipos sem uso (`G10 <relpath> (export sem uso: <simbolo>)`) e dependências/devDependencies declaradas sem uso (`G10 <api|web>/package.json <dep> (dependência sem uso)`).
- **FR-009**: Nenhum arquivo de `api/src/` ou `web/src/` pode ser excluído das verificações (salvo as exceções que definem cada regra: `config/**` na `G5`, `integrations/**` na `G7`, `repositories/**` na `G11`), e nenhum comentário de supressão pode ser usado.
- **FR-010**: `scripts/pre-commit.sh` (invocado por `.githooks/pre-commit`) MUST rodar o modo `--pre-commit` do orquestrador cobrindo no mínimo `G1` e `G2` e bloquear commits quando houver falha.
- **FR-011**: `kit-gates-proprios/` MUST conter os exemplos de violação `.modelo` e `manifesto` para `G11` e `G12`, além de `kit-gates-proprios/verificar.sh` capaz de plantar cada violação, verificar o bloqueio com ID + arquivo na saída e restaurar o repositório limpo.

### Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run gates` executa todas as verificações `G1`–`G12` em sequência sem parar na primeira falha e lista 100% das categorias violadas no código legado atual (`G2`, `G4`, `G5`, `G6`, `G7`, `G8`, `G10`, `G11`, `G12`, e `G9` caso aplicável).
- **SC-002**: Testes de sanidade confirmam detecção de `import type` em `G6` e `G8`, ciclo órfão em `G9`, dependência declarada sem instalação (`left-pad`) e export morto em `G10`, e violações `G11` e `G12` com formato `<ID> <arquivo>` exato na mesma linha.
- **SC-003**: `scripts/pre-commit.sh` bloqueia commits com erro de tipo (`G1`) e variável sem uso (`G2`).
- **SC-004**: `api/package-lock.json`, `web/package-lock.json` e todos os arquivos dentro de `api/src/` e `web/src/` permanecem sem qualquer alteração nesta Spec 002.

## Assumptions

- Node.js >= 22, npm, Git e Bash estão disponíveis no ambiente local, conforme definido na Constituição.
- A correção das violações atualmente presentes no código legado de `api/src/` e `web/src/` será executada na Spec 003 (`003-refatoracao-invariantes`), razão pela qual `npm run gates` falhará sobre o legado ao término da Spec 002 (comportamento esperado).
