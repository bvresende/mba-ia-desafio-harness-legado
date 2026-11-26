# CLI & Output Contracts: Gates Determinísticos e Hooks (`002-gates-e-hooks`)

## 1. Comandos Raiz e Scripts

### `npm run gates` → `bash scripts/gates.sh` → `node scripts/lib/run-gates.mjs`

- **Comportamento**:
  1. Executa todas as verificações na ordem lógica (`G1`, `G2/G5/G12`, `G3`, `G4/G6/G7/G8/G9/G11`, `G10`), **nunca** abortando após a primeira falha.
  2. Coleta todas as violações deduplicadas por `(id, target)` e imprime ao final a lista consolidada em stdout.
  3. Sai com código `0` somente se nenhuma violação foi encontrada e todas as ferramentas executaram sem falha interna; sai com código `1` caso contrário.

### `scripts/pre-commit.sh` (invocado por `.githooks/pre-commit`)

- **Comportamento**:
  1. Executa `node scripts/lib/run-gates.mjs --pre-commit`.
  2. No modo `--pre-commit`, valida `G1` (TypeScript `api/` e `web/`) e `G2` (ESLint lint geral em `api/src/` e `web/src/`).
  3. Bloqueia o commit (`exit 1`) caso haja erro de tipo, erro de lint ou warning de lint, imprimindo as violações encontradas.

## 2. Formato de Saída Consolidada

Ao final da execução, `run-gates.mjs` imprime uma linha por violação única no formato:

```text
<ID> <caminho-relativo-do-arquivo>[ (<detalhe>)]
```

Exemplos normativos:

- `G1 api/src/services/contagem-pendentes.ts`
- `G2 web/src/titulo-pagina.ts`
- `G3 api/src/services/conferencia.test.ts`
- `G4 api/src/http/routes/stats.ts`
- `G5 api/src/services/modo-ia.ts`
- `G6 api/src/services/attachment-service.ts`
- `G7 api/src/http/routes/tickets.ts`
- `G8 web/src/pages/TicketDetailPage.tsx`
- `G9 api/src/services/ciclo-a.ts`
- `G9 api/src/services/ciclo-b.ts`
- `G10 api/src/utils/legacy-sla.ts`
- `G10 api/src/services/arredonda.ts (export sem uso: truncar)`
- `G10 api/package.json left-pad (dependência sem uso)`
- `G11 api/src/jobs/triage-worker.ts`
- `G12 web/src/pages/TicketDetailPage.tsx`

Regras do formato:
1. Todos os caminhos são relativos à raiz do repositório com separador `/`.
2. O ID da regra (`G1`..`G12`) e o caminho do arquivo (e nome do pacote em dependência sem uso) aparecem **na mesma linha**, compatível com `grep -qw "$ID"` e `grep -qF "$TERMO"` do `kit-gates/verificar.sh`.
3. Em caso de sucesso completo, imprime resumo informando `0 violações` e sai com `0`.

## 3. Verificador das Regras Próprias (`kit-gates-proprios/verificar.sh`)

- Interface compatível com `kit-gates/verificar.sh`:
  `bash kit-gates-proprios/verificar.sh <pasta-do-repo> "<comando de gates>" [regra]`
- Planta os arquivos `.modelo` de `kit-gates-proprios/violacoes/<caso>/arquivos/` no repositório alvo, executa `<comando de gates>`, verifica que o código de saída é diferente de zero e que a saída contém uma linha com o ID da regra e o arquivo citado no `manifesto`, desfaz todos os arquivos criados e garante `git status` inalterado ao final.
