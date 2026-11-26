# Quickstart & Validation Guide: Gates Determinísticos e Hooks (`002-gates-e-hooks`)

## 1. Pré-requisitos

- Dependências instaladas na raiz, `api/` e `web/` (automatizado via `npm run up`, ou `npm ci` na raiz, `api/` e `web/`).

## 2. Rodar os gates completos

```bash
npm run gates
```

- Na Spec 002 (antes da refatoração da Spec 003), o comando deve percorrer todas as checagens sem parar na primeira falha, acender múltiplas regras no código legado (`G2`, `G4`, `G5`, `G6`, `G7`, `G8`, `G10`, `G11`, `G12`) e sair com código `1`.
- Após a Spec 003, `npm run gates` passará com código `0`.

## 3. Validar as regras próprias (G11 e G12)

Com o `git status` limpo (ou após a Spec 003 quando a linha de base passar):

```bash
bash kit-gates-proprios/verificar.sh . "npm run gates"
```

Nota: enquanto o código legado da `main` ainda contiver violações pré-Spec-003, a linha de base do `verificar.sh` emitirá aviso de código `1`, mas ainda é possível confirmar que cada violação plantada (`G11` e `G12`) gera linha própria com `<ID>` e `<arquivo>`.

## 4. Validar hook `pre-commit`

```bash
git config --get core.hooksPath   # esperado: .githooks (ativado por npm run up)
```

Testar com erro de tipo (`G1`) e variável sem uso (`G2`):

```bash
printf "export const total: number = 'muitos'\n" > api/src/services/teste-hook.ts
git add api/src/services/teste-hook.ts && git commit -m "teste hook G1"
# Esperado: bloqueado com G1 api/src/services/teste-hook.ts
git reset -q && rm api/src/services/teste-hook.ts
```
