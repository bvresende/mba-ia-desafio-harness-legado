# Implementation Plan: Gates Determinísticos e Hooks de Qualidade

**Branch**: `002-gates-e-hooks` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-gates-e-hooks/spec.md`

## Summary

Implementar o Pilar 2 (gates determinísticos `G1`–`G12`, hook Git `pre-commit` e kit de violações próprias `kit-gates-proprios/`) antes da refatoração do código legado. Todas as ferramentas de análise estática (ESLint 9, `dependency-cruiser`, `knip`) são instaladas como `devDependencies` na raiz do repositório, preservando intactos os lockfiles e fontes de `api/` e `web/`. Um orquestrador único em Node.js (`scripts/lib/run-gates.mjs`), invocado por `scripts/gates.sh` (`npm run gates`) e `scripts/pre-commit.sh` (`.githooks/pre-commit`), executa todas as checagens sem curto-circuito e emite uma linha deduplicada por violação no formato `<ID> <caminho-relativo-do-arquivo> ...`.

## Technical Context

**Language/Version**: Node.js LTS (>= 22, ESM `.mjs`), Bash (POSIX/Bash 3.2+ compatível com Linux e macOS), TypeScript 5.9 (`api/` e `web/`)

**Primary Dependencies**: `eslint` (v9), `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `dependency-cruiser`, `knip`; mais os binários já existentes `tsc` e `vitest` em `api/` e `web/`

**Storage**: N/A (análise estática e testes unitários sem banco de dados)

**Testing**: Execução real de `npm run gates` contra o legado (verificando acionamento de todos os IDs esperados sem short-circuit), testes de sanidade pontuais para `import type` (G6/G8), ciclos órfãos (G9), dependência não instalada / export morto (G10), `kit-gates-proprios/` (G11/G12) e bloqueio do hook `pre-commit` (G1/G2)

**Target Platform**: Linux e macOS (apenas Bash, Git e Node.js LTS)

**Project Type**: Ferramental de governança/harness na raiz do monorepo (`api/` + `web/`)

**Performance Goals**: Execução completa de `npm run gates` em segundos; `--pre-commit` rápido executando G1 + G2

**Constraints**: Não modificar `api/src/`, `web/src/`, `api/package-lock.json` nem `web/package-lock.json`; zero comentários de supressão e zero exclusões indevidas de arquivos; compatibilidade integral com o parser do `kit-gates/verificar.sh`

**Scale/Scope**: 12 invariantes (`G1`–`G10` obrigatórias + `G11` e `G12` próprias) cobrindo integralmente `api/src/` e `web/src/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Preservação Estrita do Contrato**: PASS — Nenhum código de runtime da API, worker ou front é alterado nesta spec.
- **II. Isolamento Total por Worktree e Idempotência**: PASS — `scripts/up.sh` passa a executar `ensure_npm_ci "$REPO_ROOT"` de forma idempotente para que clones limpos e worktrees já tenham as ferramentas de gate e o hook operacionais após `npm run up`.
- **III. Gates Determinísticos Primeiro, Zero Supressões**: PASS — Implementa integralmente `G1`–`G12` antes da refatoração (Spec 003), sem short-circuit, sem supressões e sem exclusões indevidas além das definições de cada regra (`config/` na G5, `integrations/` na G7, `repositories/` na G11).
- **IV. Integridade Estrutural e Restrições de Stack**: PASS — Nenhuma pasta fixa movida ou renomeada; `api/package-lock.json` e `web/package-lock.json` preservados intocados; apenas Bash, Git e Node.js LTS utilizados.
- **V. Documentação Verificável e Aprendizado Contínuo**: PASS — Motivações e exemplos reproduzíveis das regras próprias `G11` e `G12` versionados em `kit-gates-proprios/`.
- **VI. Execução por Specs com Controle de Contexto**: PASS — Artefatos do Spec Kit versionados em `specs/002-gates-e-hooks/` e `.specify/feature.json` atualizado.

*Re-check pós-Phase 1*: PASS — Contratos de saída, configurações e testes de sanidade alinhados aos 6 princípios.

## Project Structure

### Documentation (this feature)

```text
specs/002-gates-e-hooks/
├── spec.md
├── checklists/
│   └── requirements.md
├── plan.md
├── research.md
├── contracts/
│   └── gates-output.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
package.json                                 # Atualizado: devDependencies na raiz + script "gates": "bash scripts/gates.sh"
package-lock.json                            # Novo: lockfile das devDependencies da raiz
eslint.config.mjs                            # Novo: config ESLint 9 flat (G2, G5, G12)
.dependency-cruiser.cjs                      # Novo: regras arquiteturais e de ciclo (G4, G6, G7, G8, G9, G11)
knip.json                                    # Novo: detecção de arquivos, exports/tipos e dependências sem uso (G10)
scripts/
├── up.sh                                    # Atualizado: chama ensure_npm_ci "$REPO_ROOT"
├── gates.sh                                 # Novo: entrypoint executável de npm run gates
├── pre-commit.sh                            # Novo: entrypoint executável chamado por .githooks/pre-commit
└── lib/
    └── run-gates.mjs                        # Novo: orquestrador sem curto-circuit (modo completo e --pre-commit)
kit-gates-proprios/
├── verificar.sh                             # Novo: verificador para G11 e G12 no padrão do kit-gates
└── violacoes/
    ├── G11-prisma-no-servico/
    │   ├── manifesto
    │   └── arquivos/api/src/services/consulta-direta.ts.modelo
    └── G12-fetch-na-pagina/
        ├── manifesto
        └── arquivos/web/src/pages/ResumoDiretoPage.tsx.modelo
```

**Structure Decision**: Centraliza toda a infraestrutura de gates na raiz para evitar poluir `api/package-lock.json` e `web/package-lock.json` e permitir execução única consolidada via `npm run gates`, mantendo `kit-gates-proprios/` separado de `api/src/` e `web/src/` e ignorado apenas pelo ESLint global (arquivos `.modelo` não são analisados por `tsc`, `vitest`, `dependency-cruiser` nem `knip`).

## Complexity Tracking

Nenhuma violação à Constituição identificada.
