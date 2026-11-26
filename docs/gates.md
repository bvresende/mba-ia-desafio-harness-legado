# Documentação dos Gates (`G1`–`G12`)

Os gates determinísticos do Balcão garantem que tipos, qualidade de código, testes unitários, fronteiras arquiteturais e limpeza de código morto sejam verificados mecanicamente antes de qualquer mudança ser aceita.

## Execução e Orquestração

- **Comando único**: `npm run gates` (delega para `scripts/gates.sh` → `node scripts/lib/run-gates.mjs`).
- **Sem curto-circuito**: o orquestrador executa todas as ferramentas em sequência (`tsc` em `api/` e `web/`, `eslint`, `vitest`, `depcruise`, `knip`), acumula todas as violações deduplicadas e só sai com código `1` ao final se houver alguma falha (ou erro interno de ferramenta).
- **Zero supressões**: comentários `eslint-disable`, `@ts-ignore`, `@ts-expect-error` e `@ts-nocheck` são proibidos em `api/src/` e `web/src/`. Nenhum arquivo de código-fonte é excluído das checagens além das exceções que definem cada regra.

## Catálogo de Regras (`G1`–`G12`)

| ID | Regra | Ferramenta | Configuração / Alvo |
|---|---|---|---|
| `G1` | Zero erro de tipo TypeScript em `api/` e `web/`. | `tsc` | `api/tsconfig.json` e `web/tsconfig.json` (`--noEmit --pretty false`) |
| `G2` | Lint sem erro e sem warning em `api/src/` e `web/src/` (`@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `react-hooks`). | `eslint` (v9) | `eslint.config.mjs` (`--max-warnings 0 --format json`) |
| `G3` | Testes unitários da API (`api/src/**/*.test.ts`) passam sem banco de dados. | `vitest` | `api/vitest.config.mts` (`vitest run --reporter=json --outputFile=...`, `NODE_ENV=test`) |
| `G4` | Nada em `api/src/http/` importa `@prisma/client` nem qualquer módulo de `api/src/repositories/`. | `dependency-cruiser` | `.dependency-cruiser.cjs` (`from: ^api/src/http/`, `tsPreCompilationDeps: true`) |
| `G5` | `process.env` só aparece em `api/src/config/`; `import.meta.env` só aparece em `web/src/config/`. | `eslint` (`no-restricted-syntax`) | `eslint.config.mjs` (regras com marcador `[G5]`, `ignores` restrito a `config/**`) |
| `G6` | Nada em `api/src/services/` importa `express`, `multer` ou `api/src/http/` (inclusive `import type`). | `dependency-cruiser` | `.dependency-cruiser.cjs` (`from: ^api/src/services/`, `tsPreCompilationDeps: true`) |
| `G7` | O pacote `openai` só é importado em `api/src/integrations/`. | `dependency-cruiser` | `.dependency-cruiser.cjs` (`from: ^(api/src\|web/src)/`, `pathNot: ^api/src/integrations/`) |
| `G8` | Nada em `web/` importa arquivos de `api/` (inclusive `import type`). | `dependency-cruiser` | `.dependency-cruiser.cjs` (`from: ^web/`, `to: ^api/`, `tsPreCompilationDeps: true`) |
| `G9` | Nenhum import circular em `api/src/` nem em `web/src/` (inclusive arquivos órfãos). | `dependency-cruiser` | `.dependency-cruiser.cjs` (`to: { circular: true }`, expandindo `from` e todos os nós `cycle[].name`) |
| `G10` | Nenhum arquivo sem uso, export/tipo sem uso ou dependência declarada sem uso em `api/` e `web/`. | `knip` | `knip.json` (`ignoreWorkspaces: ["."]`, `--workspace api --workspace web --reporter json`) |
| `G11` | *(Própria)* `@prisma/client` só é importado em `api/src/repositories/` (inclusive `import type`). | `dependency-cruiser` | `.dependency-cruiser.cjs` (`from: ^api/src/`, `pathNot: ^api/src/repositories/`) |
| `G12` | *(Própria)* `fetch`, `window.fetch` e `globalThis.fetch` proibidos em `web/src/pages/` e `web/src/components/`. | `eslint` (`no-restricted-globals`, `no-restricted-properties`) | `eslint.config.mjs` (marcador `[G12]` aplicado em `web/src/pages/**` e `web/src/components/**`) |

### Detalhes das configurações

- **Typecheck (`G1`)**: roda `./node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false` dentro de `api/` e `web/`, convertendo os caminhos de erro para relativos à raiz do repositório.
- **ESLint (`G2`, `G5`, `G12`)**: em `eslint.config.mjs`, o bloco de `ignores` globais limita-se a pastas que não são código da aplicação (`**/node_modules/**`, `**/dist/**`, `.balcao-env/**`, `kit-gates/**`, `kit-gates-proprios/**`, `blackbox/**`, `specs/**`, `scripts/**`). As exceções da `G5` (`api/src/config/**` e `web/src/config/**`) ficam escopadas apenas nos blocos da própria regra `no-restricted-syntax`, mantendo `config/` coberto por `G2`. Em `scripts/lib/run-gates.mjs`, a classificação verifica `text.includes('[G5]')` e `text.includes('[G12]')` porque o ESLint adiciona prefixos automáticos (como `"Unexpected use of 'fetch'. "`) antes da mensagem customizada.
- **Vitest (`G3`)**: executa `vitest run --reporter=json --outputFile=<arquivo-temporario>` em `api/` com `NODE_ENV=test` e mapeia suítes ou assertions com `status === 'failed'` para `G3 <arquivo>`.
- **Dependency Cruiser (`G4`, `G6`, `G7`, `G8`, `G9`, `G11`)**: executa `depcruise --config .dependency-cruiser.cjs --output-type json api/src web/src` com `tsPreCompilationDeps: true` para capturar `import type` antes do type erasure do TypeScript.
- **Knip (`G10`)**: restringe a análise aos workspaces `api` e `web` (`knip.json` com `ignoreWorkspaces: ["."]`) declarando explicitamente os entrypoints fixos (`src/main.ts`, `src/jobs/triage-worker.ts`, `prisma/seed.ts`, `src/**/*.test.ts`, `test/integration/**/*.test.ts`, `src/main.tsx`, `vite.config.ts`). Reporta arquivos órfãos, exports/tipos não utilizados e dependências/devDependencies não utilizadas nos `package.json`.

## Motivação das Regras Próprias (`G11` e `G12`)

- **`G11` — `@prisma/client` restrito a `api/src/repositories/`**:
  A regra `G4` do enunciado protege apenas `api/src/http/`, deixando `services/`, `jobs/` e `utils/` livres para acoplar com o ORM. No código legado do Balcão, `api/src/jobs/triage-worker.ts` instanciava um `new PrismaClient()` próprio diretamente no job de fundo. Restringir `@prisma/client` a `api/src/repositories/` garante um único ponto de acesso ao banco (`prisma.ts`), preserva o desacoplamento de persistência e mantém os serviços testáveis sem banco.
- **`G12` — Proibição de `fetch` direto em `web/src/pages/` e `web/src/components/`**:
  No código legado, `web/src/pages/TicketDetailPage.tsx` realizava uma chamada `fetch` direta no download de anexos (`handleDownload`), duplicando a resolução de `VITE_API_URL`, a montagem do header `Authorization: Bearer ...` e o tratamento de erro fora de `web/src/api/`. Bloquear `fetch`, `window.fetch` e `globalThis.fetch` em páginas e componentes força toda comunicação HTTP a passar por `web/src/api/` (`client.ts` e `tickets.ts`).

## Formato de Saída

Quando há violações, `npm run gates` imprime uma linha por violação única no formato:

```text
<ID> <caminho-relativo-do-arquivo>[ (<detalhe>)]
```

Exemplos:

```text
G4 api/src/http/routes/stats.ts
G10 api/package.json left-pad (dependência sem uso)
G11 api/src/services/consulta-direta.ts
G12 web/src/pages/ResumoDiretoPage.tsx
```

Em caso de sucesso completo, imprime `Gates OK (G1–G12): 0 violações.` e retorna código `0`.

## Hook `pre-commit`

O script `scripts/up.sh` configura `git config core.hooksPath .githooks`. A cada `git commit`, `.githooks/pre-commit` executa `scripts/pre-commit.sh` (`node scripts/lib/run-gates.mjs --pre-commit`), que valida `G1` (TypeScript em `api/` e `web/`) e `G2` (ESLint `--max-warnings 0` em `api/src/` e `web/src/`), bloqueando o commit caso exista qualquer erro de tipo, erro de lint ou warning.

## Kits de Verificação

- **Kit oficial (`G1`–`G10`)**:
  ```bash
  bash kit-gates/verificar.sh . "npm run gates"
  ```
- **Kit das regras próprias (`G11` e `G12`)**:
  ```bash
  bash kit-gates-proprios/verificar.sh . "npm run gates"
  ```
  Os exemplos versionados residem fora de `api/src/` e `web/src/` em formato `.modelo`:
  - `kit-gates-proprios/violacoes/G11-prisma-no-servico/arquivos/api/src/services/consulta-direta.ts.modelo`
  - `kit-gates-proprios/violacoes/G12-fetch-na-pagina/arquivos/web/src/pages/ResumoDiretoPage.tsx.modelo`
