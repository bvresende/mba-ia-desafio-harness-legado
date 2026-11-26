---
description: "Task list for Feature 004: Documentação Verificável e Registro de Incidentes"
---

# Tasks: Documentação Verificável e Registro de Incidentes

**Input**: Design documents from `/specs/004-docs-e-incidentes/`

**Prerequisites**: `spec.md`, `plan.md`

---

## Phase 1: Artefatos Spec Kit & Documentação

- [X] T001 Atualizar `.specify/feature.json` para `specs/004-docs-e-incidentes` e criar `spec.md`, `checklists/requirements.md`, `plan.md` e `tasks.md`
- [X] T002 Criar `AGENTS.md` na raiz (<= 60 linhas) como índice verificável com comandos, contas da seed, regras `G1`–`G12` e ponteiros
- [X] T003 Substituir `CLAUDE.md` na raiz por ponteiro curto para `AGENTS.md` e `README.md`
- [X] T004 Criar `docs/gates.md` documentando `G1`–`G12`, ferramentas, configurações, motivações de `G11`/`G12`, formato de saída e kits
- [X] T005 Criar `docs/incidentes.md` registrando os 3 incidentes reais (`0f30651`, `68b8c9b`, `16cbc80`) com causa, mudança no harness e hash
- [X] T006 Reescrever `README.md` na raiz cobrindo todas as 5 seções do entregável (Como rodar, Contas da seed, Gates + reprodução `G11`/`G12`, Decisões, Registro de incidentes)

## Phase 2: Verificações e Commit

- [X] T007 Verificar `wc -l AGENTS.md` (<= 60), existência de todos os caminhos citados, `git show --stat` de `0f30651`, `68b8c9b` e `16cbc80`
- [X] T008 Executar `npm run gates` (e checar kits de verificação) confirmando tudo verde
- [X] T009 Marcar todas as tarefas como `[X]` e commitar na `main` passando normalmente pelo hook `pre-commit`
