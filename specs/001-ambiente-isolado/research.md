# Research: Ambiente Isolado e Idempotente por Cópia

## 1. Identificação determinística de instância por worktree

- **Decision**: Gerar `INSTANCE_ID` determinístico a partir do caminho físico (`pwd -P`) da raiz do repositório usando Node.js (`crypto.createHash('sha256')`), combinando slug sanitizado do nome da pasta (máx. 16 chars `[a-z0-9-]`) + 8 caracteres hexadecimais do hash: `balcao-<slug>-<hash8>`. Usar o mesmo identificador como `COMPOSE_PROJECT_NAME` e derivar `DB_NAME=balcao_<hash8>`.
- **Rationale**: Funciona de forma idêntica em Linux e macOS sem depender de `sha256sum` vs `shasum`, evita colisões mesmo quando duas worktrees têm o mesmo basename em diretórios diferentes, e garante que porta, nome do container, volume Docker e nome do banco sejam distintos entre cópias.
- **Alternatives considered**:
  - Usar apenas o nome da pasta: colide se duas pastas tiverem o mesmo nome em diretórios pais diferentes ou caracteres inválidos para Docker Compose/Postgres.
  - ID aleatório (UUID) por execução: quebraria a idempotência caso o estado fosse perdido ou dificultaria rastrear a qual diretório pertence cada container.

## 2. Alocação portátil de portas livres (Linux e macOS)

- **Decision**: Implementar `scripts/lib/find-port.mjs` usando o módulo nativo `node:net` para testar portas candidatas sequencialmente a partir de uma porta preferida (ex.: `5432` para DB, `4000` para API, `5173` para front), excluindo portas já reservadas na mesma execução (`--exclude`) e validando bind tanto em `127.0.0.1` quanto em `0.0.0.0`.
- **Rationale**: `lsof`, `ss` e `netstat` têm flags incompatíveis entre Linux e macOS (ou podem não estar instalados em ambientes mínimos), enquanto Node.js LTS é pré-requisito garantido pelo enunciado. Testar a partir da porta padrão preserva a ergonomia na primeira cópia (`4000`/`5173`/`5432`) e salta automaticamente para portas livres na segunda worktree.
- **Alternatives considered**:
  - `lsof`/`ss` em Bash: portátil apenas parcialmente e sujeito a diferenças de permissão entre usuários.
  - Porta 0 efêmera do SO: funciona, mas produz portas altas menos legíveis; testar a partir da base (ou fallback para porta 0) combina previsibilidade e robustez.

## 3. Isolamento do Postgres por worktree

- **Decision**: Usar container Postgres 16 dedicado por worktree via `docker compose -p "$COMPOSE_PROJECT_NAME"`, parametrizando `docker-compose.yml` com `${DB_PORT:-5432}:5432`, `POSTGRES_DB: ${POSTGRES_DB:-balcao}` e `healthcheck` com `pg_isready`.
- **Rationale**: Isolamento 100% independente de ciclo de vida e dados. Derrubar a cópia B executa `docker compose -p "$COMPOSE_PROJECT_NAME" down` afetando exclusivamente o container da cópia B, sem qualquer risco de derrubar o banco da cópia A (decisão alinhada com o usuário).
- **Alternatives considered**:
  - Postgres compartilhado com múltiplos databases lógicos: exigiria contagem de referências para decidir quando parar o container ao executar `npm run down`, aumentando fragilidade.

## 4. Localização de estado efêmero e pasta de anexos

- **Decision**: Armazenar todo estado de runtime e anexos dentro de `<repo-root>/.balcao-env/` (`state.env`, `pids/`, `logs/`, `uploads/`), ignorado no `.gitignore`.
- **Rationale**: Cada worktree possui seu próprio caminho absoluto `<repo-root>/.balcao-env/uploads`, impedindo qualquer colisão de anexos entre cópias, sobrevivendo a reinícios (diferente de `/tmp`), mantendo `git status` limpo e permitindo inspeção trivial pelo avaliador.
- **Alternatives considered**:
  - `/tmp/balcao/<hash>/uploads`: apagado em reboot e menos visível para quem inspeciona a worktree.

## 5. Idempotência da seed (`api/prisma/seed.ts`)

- **Decision**: Substituir `prisma.user.create` por `prisma.user.upsert` indexado por `email` (com `update: {}` para não sobrescrever registros existentes) e envolver cada um dos 3 chamados iniciais em verificação prévia `prisma.ticket.findFirst({ where: { customerId: customer.id, title } })`, criando o chamado e suas respostas iniciais apenas se ausente.
- **Rationale**: Resolve tanto o erro imediato de `Unique constraint failed` em `User.email` quanto a duplicação silenciosa dos 3 chamados/respostas sem precisar alterar o `schema.prisma` ou criar novas migrations.
- **Alternatives considered**:
  - Adicionar constraint `@unique` em `Ticket.title`: alteraria o schema e quebraria cenários onde clientes abrem dois chamados com o mesmo título.
  - Checar `prisma.ticket.count() === 0`: não recriaria um chamado seed ausente se a tabela já tivesse outro chamado criado por teste; checar por `(customerId, title)` é exato e seguro.

## 6. Gerenciamento de processos em segundo plano e encerramento limpo

- **Decision**: Iniciar API (`api/node_modules/.bin/tsx --env-file=.env src/main.ts`), worker (`api/node_modules/.bin/tsx --env-file=.env src/jobs/triage-worker.ts`) e front (`web/node_modules/.bin/vite --port "$WEB_PORT" --strictPort --host localhost`) diretamente pelos binários locais com `nohup ... > "$LOG" 2>&1 < /dev/null &`, gravando o PID em `.balcao-env/pids/<servico>.pid`. Na derrubada (`down.sh`), encerrar a árvore de processos filha + PID gravado com `SIGTERM` e fallback `SIGKILL`, verificando antes se o PID ainda corresponde ao serviço esperado.
- **Rationale**: Evita o processo wrapper extra do `npm run`, impede que file descriptors abertos travem o retorno do `scripts/up.sh` em shells/agentes, e garante que `down.sh` nunca mate processos de outra worktree. Adicionar handlers `SIGINT`/`SIGTERM` em `main.ts` e `triage-worker.ts` garante desconexão limpa do Prisma.
- **Alternatives considered**:
  - `pkill -f tsx` ou `kill -9` na porta: perigosíssimo em ambiente multi-worktree (mataria processos da outra cópia).
  - `pm2` / `foreman`: adicionaria dependências globais proibidas pelas restrições do avaliador.

## 7. Compatibilidade de `api/src/config/env.ts` com testes unitários

- **Decision**: Expandir `api/src/config/env.ts` com `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`, `TRIAGE_INTERVAL_MS`, `AI_MODE`, `OPENAI_API_KEY`, `JWT_SECRET` e `DATABASE_URL`, permitindo default seguro para `DATABASE_URL` quando `NODE_ENV === 'test'` (ou via validação condicional) para que `vitest run` continue rodando sem `.env` nem banco.
- **Rationale**: Os testes unitários (`api/src/**/*.test.ts`) não devem depender de banco nem de `.env`; exigir `DATABASE_URL` no import em modo `test` quebraria G3 assim que módulos importarem `config/env.ts`.

## 8. Ativação automática do hook Git em clones e worktrees

- **Decision**: Versionar `.githooks/pre-commit` (executável) e executar `git config core.hooksPath .githooks` dentro de `scripts/up.sh`.
- **Rationale**: Em Git moderno, `core.hooksPath` com caminho relativo resolve a partir da raiz da working tree ativa (tanto em clone normal quanto em `git worktree`), não exige `husky` nem etapa manual pós-clone, e na Spec 001 deixa o gancho pronto para ser conectado aos gates de tipo e lint na Spec 002.
