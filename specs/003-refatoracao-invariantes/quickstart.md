# Quickstart & Validation Guide: Refatoração Completa das Invariantes (`003-refatoracao-invariantes`)

## 1. Validação isolada do Frontend (`web/`)

```bash
(cd web && ./node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false && npm run build)
./node_modules/.bin/eslint --max-warnings 0 "web/src/**/*.{ts,tsx}"
npx depcruise web/src --config .dependency-cruiser.cjs
npx knip --workspace web
```

Resultado esperado após a refatoração de `web/`: 0 erros e 0 warnings em todos os comandos acima.

## 2. Validação completa de Gates (`api/` + `web/`)

```bash
npm run gates
```

Resultado esperado após concluir também `api/`:
- Código de saída `0` (`Gates OK (G1–G12): 0 violações.`).

## 3. Verificação contra falsos positivos, regressão de gates e supressões

```bash
bash kit-gates/verificar.sh . "npm run gates"
bash kit-gates-proprios/verificar.sh . "npm run gates"
git grep -nE "eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck" -- api/src web/src
```

Resultado esperado: 100% das violações do kit barradas, árvore restaurada ao término e 0 ocorrências de supressão no `git grep`.

## 4. Validação funcional ponta a ponta (`blackbox/`)

```bash
npm run up
# Executar a suíte blackbox conforme configuração local
npm run down
```

Resultado esperado: 100% dos testes caixa-preta passando sem alterações em `blackbox/`.
