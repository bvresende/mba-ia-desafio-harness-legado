# Registro de Incidentes do Harness

Este documento registra erros reais ocorridos durante o desenvolvimento com agentes neste repositório e a mudança concreta aplicada no harness para impedir que o erro se repita.

---

## Incidente 1 — Daemons iniciados com `nohup ... &` encerrados ao sair do subshell do agente

- **Commit da correção no harness**: `0f30651`
- **Fase**: Validação da Spec 001 (`001-ambiente-isolado`) com duas worktrees simultâneas (`copia-a` e `copia-b`)

### O que aconteceu

Na primeira versão de `scripts/up.sh`, a API, o worker de triagem e o servidor Vite eram iniciados em segundo plano usando `nohup bash -c '...' &`. Quando o subagent/shell do agente concluía o comando `npm run up` e encerrava sua sessão, os processos filhos ainda ligados ao grupo/sessão do shell eram encerrados. Ao subir a segunda worktree (`copia-b`) logo em seguida, o alocador de portas encontrava `4000` e `5173` livres novamente e subia `copia-b` nas mesmas portas que deveriam pertencer à `copia-a`.

### Mudança no harness que impede a repetição

Foi criada a função `spawn_detached` em `scripts/lib/env-utils.sh` usando `node:child_process` (`spawn(cmd, args, { cwd: workdir, detached: true, stdio: ["ignore", out, out] })` seguido de `child.unref()`), substituindo os blocos `nohup ... &` em `scripts/up.sh`. Assim, API, worker e Vite iniciam em uma nova sessão independente e permanecem ativos após o término do shell que executou `npm run up`, garantindo isolamento real de portas entre worktrees.

---

## Incidente 2 — Wrapper `node -e` interceptando flag `--env-file=.env` do processo filho

- **Commit da correção no harness**: `68b8c9b`
- **Fase**: Ajustes pós-migração para `spawn_detached` na Spec 001 (`001-ambiente-isolado`)

### O que aconteceu

Ao invocar `spawn_detached` passando `./node_modules/.bin/tsx --env-file=.env src/main.ts` como argumentos para o wrapper `node -e '...' "$workdir" "$log_file" "$@"`, o próprio runtime do Node.js executando o script inline interpretou `--env-file=.env` como uma flag sua na raiz do repositório (onde não existe `.env`), falhando imediatamente com `node: .env: not found` antes mesmo de lançar o `tsx` dentro de `api/`.

### Mudança no harness que impede a repetição

Foi inserido o separador `--` antes dos argumentos repassados ao wrapper (`' -- "$workdir" "$log_file" "$@"'`) em `scripts/lib/env-utils.sh`, garantindo que o Node.js trate todas as flags subsequentes (como `--env-file=.env` e `--port`) exclusivamente como `process.argv` destinado ao processo filho.

---

## Incidente 3 — Prefixo do ESLint em `no-restricted-globals`, saída em arquivo do Vitest 5 e escopo do Knip

- **Commit da correção no harness**: `16cbc80`
- **Fase**: Implementação e testes de sanidade dos gates na Spec 002 (`002-gates-e-hooks`)

### O que aconteceu

Durante os testes de sanidade e execução dos gates sobre o código legado na Spec 002, três ferramentas apresentaram desvios silenciosos de comportamento:
1. A regra `no-restricted-globals` do ESLint prefixa automaticamente `"Unexpected use of 'fetch'. "` antes da mensagem customizada `[G12] ...`, fazendo com que checagens por prefixo (`startsWith('[G12]')`) classificassem violações `G12` erroneamente como `G2`.
2. O Vitest 5 com `--reporter=json` passou a gravar/depender de arquivo de saída dedicado em vez de emitir JSON puro diretamente no stdout limpo esperado pelo parser.
3. Sem restrição explícita de workspace, o `knip` analisava também a raiz do repositório (incluindo `blackbox/` e `scripts/`), misturando falsos positivos de harness com os workspaces `api` e `web`.

### Mudança no harness que impede a repetição

No commit `16cbc80`:
- `scripts/lib/run-gates.mjs` passou a classificar mensagens do ESLint por `text.includes('[G5]')` e `text.includes('[G12]')` e a invocar o Vitest com `--outputFile=<arquivo-temporario>` (lendo e removendo o JSON em `finally`).
- `knip.json` foi configurado com `"ignoreWorkspaces": ["."]` e `scripts/lib/run-gates.mjs` passou a invocar `knip --workspace api --workspace web --reporter json`.
- Foi adicionado o verificador `kit-gates-proprios/verificar.sh` com os cenários versionados de `G11` e `G12` para validar continuamente que nenhuma regra própria seja mascarada ou reclassificada por alterações futuras.
