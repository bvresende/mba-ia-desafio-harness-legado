# Implementation Plan: Documentação Verificável e Registro de Incidentes

**Branch**: `004-docs-e-incidentes` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-docs-e-incidentes/spec.md`

## Summary

Entregar o Pilar 4 do desafio (Documentação que não mente + Registro de incidentes) com base exclusiva nos arquivos, scripts, configurações e commits reais presentes no repositório:
1. Criar `AGENTS.md` na raiz como índice enxuto (<= 60 linhas) com comandos verificados, contas da seed, invariantes `G1`–`G12` e ponteiros.
2. Substituir o `CLAUDE.md` legado por um ponteiro conciso para `AGENTS.md` e `README.md`.
3. Criar `docs/gates.md` detalhando ferramentas, configurações, motivações de `G11`/`G12`, formato de saída e uso dos kits de verificação.
4. Criar `docs/incidentes.md` documentando os 3 incidentes reais (`0f30651`, `68b8c9b`, `16cbc80`) com causa, mudança no harness e hash verificado.
5. Reescrever `README.md` com as 5 seções obrigatórias do entregável e validar tudo na `main` com commit passando pelo hook `pre-commit`.

## Technical Context

**Language/Version**: Markdown (GitHub Flavored), Bash, Node.js LTS (>= 22)

**Primary Dependencies**: Ferramentas e scripts já versionados na raiz (`package.json`, `scripts/`, `eslint.config.mjs`, `.dependency-cruiser.cjs`, `knip.json`, `kit-gates/`, `kit-gates-proprios/`)

**Storage**: N/A (documentação versionada em Git)

**Testing**: Verificação de contagem de linhas (`wc -l AGENTS.md`), existência de caminhos no disco, `git show --stat` dos 3 hashes, `npm run gates`, `bash kit-gates/verificar.sh . "npm run gates"` e `bash kit-gates-proprios/verificar.sh . "npm run gates"`

**Target Platform**: Linux e macOS

**Project Type**: Documentação operacional e registro histórico do harness

**Constraints**: `wc -l AGENTS.md <= 60`; zero comandos ou caminhos inventados; nenhuma alteração de contrato HTTP ou pastas fixas

## Constitution Check

- **I. Preservação Estrita do Contrato**: PASS — Nenhum código da API, worker, front ou `blackbox/` é alterado.
- **II. Isolamento Total por Worktree e Idempotência**: PASS — `README.md` e `AGENTS.md` documentam fielmente os comandos `npm run up` e `npm run down` e o isolamento implementado.
- **III. Gates Determinísticos Primeiro, Zero Supressões**: PASS — `docs/gates.md` e `README.md` refletem exatamente `G1`–`G12`, zero supressões e exemplos `G11`/`G12`.
- **IV. Integridade Estrutural e Restrições de Stack**: PASS — Nenhuma pasta fixa alterada.
- **V. Documentação Verificável e Aprendizado Contínuo**: PASS — Objetivo direto desta spec (`AGENTS.md` <= 60 linhas, `CLAUDE.md` como ponteiro, `README.md` completo, `docs/incidentes.md` com 3 hashes reais do harness).
- **VI. Execução por Specs com Controle de Contexto**: PASS — Artefatos versionados em `specs/004-docs-e-incidentes/` e `.specify/feature.json`.

## Project Structure

```text
.specify/feature.json
specs/004-docs-e-incidentes/
├── spec.md
├── checklists/
│   └── requirements.md
├── plan.md
└── tasks.md
AGENTS.md
CLAUDE.md
README.md
docs/
├── gates.md
└── incidentes.md
```

## Complexity Tracking

Nenhuma violação à Constituição identificada.
