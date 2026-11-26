# Research: Gates Determinísticos e Hooks de Qualidade

## 1. Instalação centralizada na raiz vs subprojetos `api/` e `web/`

- **Decision**: Instalar `eslint@^9`, `@eslint/js@^9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `dependency-cruiser` e `knip` em `devDependencies` do `package.json` raiz, adicionando `ensure_npm_ci "$REPO_ROOT"` em `scripts/up.sh`.
- **Rationale**: Preserva intactos `api/package-lock.json` e `web/package-lock.json` (conforme Princípio IV), evita instalar ferramentas duplicadas em `api/` e `web/`, e garante que `npm run up` deixe `npm run gates` e `.githooks/pre-commit` imediatamente operacionais em um clone limpo. Nota prática: `@eslint/js@10.x` exige `eslint@^10.0.0`, portanto fixar `@eslint/js@^9` com `eslint@^9` evita conflito `ERESOLVE`.

## 2. Typecheck (G1) em `api/` e `web/`

- **Decision**: Executar `./node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false` dentro de `api/` e `web/`, parseando linhas `arquivo(linha,col): error TSxxxx: ...` para normalizar o caminho relativo à raiz (`api/...` ou `web/...`) e emitir `G1 <relpath>`.
- **Rationale**: Usa exatamente o `tsconfig.json` e a versão local de `typescript` de cada subprojeto; `--pretty false` produz saída determinística sem códigos ANSI, facilitando extração exata do arquivo.

## 3. ESLint v9 Flat Config (G2, G5, G12)

- **Decision**: Configurar `eslint.config.mjs` na raiz usando ESLint 9 flat config:
  - `ignores` globais estritamente para pastas não-código (`**/node_modules/**`, `**/dist/**`, `.balcao-env/**`, `kit-gates/**`, `kit-gates-proprios/**`, `blackbox/**`, `specs/**`, `scripts/**`).
  - Bloco API (`api/src/**/*.{ts,tsx}`) e bloco Web (`web/src/**/*.{ts,tsx}` com `eslint-plugin-react-hooks`), ambos com `@eslint/js` recommended, `typescript-eslint` recommended, `@typescript-eslint/no-unused-vars: 'error'` e `@typescript-eslint/no-explicit-any: 'error'`.
  - Bloco G5 API (`files: ['api/src/**/*.{ts,tsx}']`, `ignores: ['api/src/config/**']`) com `no-restricted-syntax` proibindo `process.env` (acesso por ponto e por colchetes) com prefixo `[G5]`.
  - Bloco G5 Web (`files: ['web/src/**/*.{ts,tsx}']`, `ignores: ['web/src/config/**']`) com `no-restricted-syntax` proibindo `import.meta.env` (acesso por ponto e por colchetes) com prefixo `[G5]`.
  - Bloco G12 (`files: ['web/src/pages/**/*.{ts,tsx}', 'web/src/components/**/*.{ts,tsx}']`) com `no-restricted-globals` (`fetch`) e `no-restricted-properties` (`window.fetch`, `globalThis.fetch`) com prefixo `[G12]`.
- **Rationale**: Em flat config, `ignores` dentro de um objeto de regra com `files` aplica-se apenas àquele objeto, garantindo que `api/src/config/**` e `web/src/config/**` continuem 100% cobertos por `G2` (e não excluídos por acidente). O runner executa `eslint --max-warnings 0 --format json` e classifica cada mensagem por prefixo (`[G5]` -> `G5`, `[G12]` -> `G12`, demais erros/warnings -> `G2`).

## 4. Testes unitários sem banco (G3)

- **Decision**: Executar `(cd api && ./node_modules/.bin/vitest run --reporter=json)` e extrair os arquivos de teste que falharam (`status === 'failed'`) convertidos para caminho relativo à raiz (`api/...`).
- **Rationale**: O `api/vitest.config.mts` já inclui `src/**/*.test.ts` e roda sem banco. Se `vitest` falhar antes de emitir JSON válido (ex.: erro de sintaxe no arquivo de teste), o runner extrai caminhos de erro ou reporta falha de `G3` com o arquivo afetado.

## 5. Regras arquiteturais, `import type` e ciclos (G4, G6, G7, G8, G9, G11)

- **Decision**: Usar `dependency-cruiser` com `tsPreCompilationDeps: true`, `doNotFollow: { path: 'node_modules' }` e saída JSON (`--output-type json`). Validar na prática se uma única invocação (`depcruise api/src web/src`) com `tsConfig: { fileName: 'api/tsconfig.json' }` resolve `import type` tanto em `api/src/` quanto em `web/src/` (incluindo imports relativos `../../api/src/...`) ou se `web/src` deve rodar com `web/tsconfig.json` (ajustando conforme resultado empírico nos testes de sanidade).
- **Rationale**: `tsPreCompilationDeps: true` instrui o `dependency-cruiser` a inspecionar a AST TypeScript antes do apagamento de tipos pelo compilador, capturando `import type { Request } from 'express'` (G6) e `import type { ... } from '../../api/src/...'` (G8) mesmo sem uso em runtime. Para `G9` (ciclos), expandir `violation.from` e todos os passos `violation.cycle[].name` pertencentes a `api/src/` ou `web/src/` garante que ambos os arquivos de qualquer ciclo apareçam na saída, inclusive em arquivos órfãos não alcançáveis a partir de `main.ts`/`main.tsx` porque `depcruise` recebe os diretórios `api/src` e `web/src` diretamente.

## 6. Código e dependências mortas (G10)

- **Decision**: Usar `knip` com `knip.json` configurando workspaces `"api"` (`entry`: `src/main.ts`, `src/jobs/triage-worker.ts`, `prisma/seed.ts`, `src/**/*.test.ts`, `test/integration/**/*.test.ts`; `project`: `src/**/*.ts`) e `"web"` (`entry`: `src/main.tsx`, `vite.config.ts`; `project`: `src/**/*.{ts,tsx}`), invocando `npx knip --reporter json` (ou `./node_modules/.bin/knip --reporter json`).
- **Rationale**: `knip` detecta simultaneamente arquivos órfãos (`files`), exports e tipos sem uso (`exports`, `types`, `duplicates` se aplicável) e dependências/devDependencies declaradas no `package.json` sem uso (`dependencies`, `unlisted`, `devDependencies`), inclusive pacotes adicionados apenas no `package.json` sem `npm install` (como `left-pad` no `kit-gates`). O runner verifica explicitamente que `ignoreExportsUsedInFile` não oculte exports mortos.

## 7. Motivação das Regras Próprias (G11 e G12)

- **G11 (`@prisma/client` restrito a `api/src/repositories/`)**: O enunciado restringe `api/src/http/` (`G4`), mas não impede que `services/`, `jobs/` ou `utils/` instanciem ou importem `@prisma/client` diretamente (como ocorre no `triage-worker.ts` legado). Centralizar `@prisma/client` exclusivamente em `api/src/repositories/` garante desacoplamento de persistência, testabilidade unitária sem banco em `services/` e ponto único de gerenciamento de conexão (`prisma.ts`).
- **G12 (`fetch` direto proibido em `web/src/pages/` e `web/src/components/`)**: No legado, páginas como `TicketDetailPage.tsx` misturam `fetch` direto com `import.meta.env` e manipulação manual de headers de autenticação, enquanto existe a camada `web/src/api/`. Proibir `fetch` direto em `pages/` e `components/` força toda comunicação HTTP a passar por `web/src/api/` (`client.ts`), garantindo URL base centralizada (`G5`), envio consistente do token JWT e tratamento uniforme de erros.
