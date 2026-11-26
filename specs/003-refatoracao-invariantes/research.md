# Research: Refatoração Completa das Invariantes (G1–G12)

## 1. Inventário exato das violações iniciais (`npm run gates`)

Execução de `npm run gates` antes da refatoração apontou **55 violações** distribuídas entre `web/` (12) e `api/` (43):

- **`web/` (12 violações)**:
  - `G2` (5): `LoginPage.tsx`, `NewTicketPage.tsx`, `RegisterPage.tsx`, `StatsPage.tsx`, `TicketDetailPage.tsx` (`err: any` e warning `react-hooks/exhaustive-deps` em `StatsPage.tsx`).
  - `G5` (3): `api/client.ts`, `api/tickets.ts`, `pages/TicketDetailPage.tsx` (`import.meta.env` direto).
  - `G8` (2): `api/tickets.ts`, `pages/TicketDetailPage.tsx` (`import type ... from '../../../api/src/domain/ticket'`).
  - `G10` (3): `web/package.json` (`axios`), `api/client.ts` (`ApiError`), `utils/format.ts` (`formatCurrency`).
  - `G12` (1): `pages/TicketDetailPage.tsx` (`fetch` direto no download de anexo).

- **`api/` (43 violações)**:
  - `G2` (11): `http/errors.ts`, `http/middlewares/auth.ts`, `http/routes/stats.ts`, `http/routes/tickets.ts`, `repositories/reply-repository.ts`, `repositories/ticket-repository.ts`, `services/attachment-service.test.ts`, `services/attachment-service.ts`, `services/auth-service.test.ts`, `services/auth-service.ts`, `services/ticket-service.test.ts`.
  - `G4` (5): `http/routes/attachments.ts`, `http/routes/auth.ts`, `http/routes/health.ts`, `http/routes/stats.ts`, `http/routes/tickets.ts`.
  - `G5` (5): `http/middlewares/auth.ts`, `http/routes/tickets.ts`, `integrations/ai-client.ts`, `jobs/triage-worker.ts`, `services/attachment-service.ts`.
  - `G6` (4): `services/attachment-service.ts`, `services/attachment-service.test.ts`, `services/ticket-service.ts`, `services/ticket-service.test.ts`.
  - `G7` (1): `http/routes/tickets.ts`.
  - `G9` (2): `services/notification-service.ts` <-> `services/ticket-service.ts`.
  - `G10` (12): `api/package.json` (`lodash`), `domain/ticket.ts` (`Role`), `http/routes/tickets.ts` (`toTicketJson`), `integrations/ai-client.ts` (`suggestReply`), `repositories/*` (`NewAttachment`, `PrismaAttachmentRepository`, `PrismaReplyRepository`, `PrismaTicketRepository`, `PrismaUserRepository`), `services/ticket-service.ts` (`calculateSlaDeadline`, `PAGE_SIZE`), `utils/legacy-sla.ts`.
  - `G11` (1): `jobs/triage-worker.ts`.

## 2. Estratégia de desacoplamento em `web/`

- **Configuração (`G5`)**: Criar `web/src/config/env.ts` exportando `env = { apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000' }`. Tanto `client.ts` quanto `tickets.ts` passam a consumir `env.apiUrl`.
- **Tipos compartilhados (`G8`)**: Em vez de importar tipos de `../../../api/src/domain/ticket`, o frontend define `web/src/types/ticket.ts` com os union types literais (`TicketStatus`, `TicketCategory`, `TicketPriority`, `TriageStatus`), mantendo total fidelidade ao contrato JSON da API sem acoplamento de build/AST.
- **Camada API (`G12`)**: Extrair o download de anexo de `TicketDetailPage.tsx` para `downloadAttachment(attachmentId: string): Promise<Blob>` em `web/src/api/tickets.ts`, mantendo exatamente o cabeçalho `Authorization: Bearer ${getToken()}` e a mensagem `'Não foi possível baixar o anexo'` em caso de `!res.ok`.
- **Narrowing seguro de erros e Hooks (`G2`)**: Substituir `err: any` por `err: unknown` com helper compartilhado `getErrorMessage(err: unknown, fallback?: string)` em `web/src/utils/format.ts`, evitando duplicação entre páginas. Em `StatsPage.tsx`, incluir `user?.role` (valor primitivo estável entre renders) no array de dependências do `useEffect`.
- **Limpeza (`G10`)**: Remover `formatCurrency`, remover `export` de símbolos usados apenas internamente (`ApiError`, `User`, `Ticket`, `Reply`) e executar `npm uninstall axios` em `web/`.

## 3. Estratégia de desacoplamento em `api/`

- **Camadas (`G4`, `G6`, `G7`, `G11`)**:
  - `http/errors.ts` deve mapear erros de domínio/aplicação (definidos fora de `http/`, ex.: `api/src/domain/errors.ts`) para status HTTP e `{ error, message }`, de forma que `services/` nunca importe `http/errors.ts`, `express` ou `multer`.
  - `attachment-service.ts` recebe DTO agnóstico de framework (ex.: `{ originalName, mimeType, sizeBytes, buffer }` ou metadata) em vez de `Express.Multer.File`.
  - Todas as rotas (`auth.ts`, `tickets.ts`, `attachments.ts`, `stats.ts`, `health.ts`) delegam acesso a dados e IA exclusivamente para serviços/casos de uso (inclusive `health` via serviço ou repository check encapsulado em serviço), removendo qualquer import direto de `@prisma/client`, `repositories/` ou `openai` em `http/`.
  - `triage-worker.ts` delega persistência para repositórios/serviços em vez de importar `PrismaClient` diretamente (`G11`).
- **Ciclo `G9`**: Quebrar o ciclo `ticket-service.ts` ↔ `notification-service.ts` mantendo dependência unidirecional (ex.: `notification-service.ts` sem importar `ticket-service.ts`, recebendo os dados/tipos necessários de `domain/`).
- **Variáveis de ambiente (`G5`)**: Garantir que `api/src/config/env.ts` valide/exponha todas as variáveis lidas pelos módulos (`JWT_SECRET`, `UPLOAD_DIR`, `AI_MODE`, `OPENAI_API_KEY`, `TRIAGE_INTERVAL_MS`, etc.), preservando defaults idênticos ao legado em desenvolvimento e teste.
- **Código morto (`G10`)**: Remover `utils/legacy-sla.ts`, remover `lodash` via `npm uninstall lodash`, remover ou internalizar exports sem uso (`Role`, `toTicketJson`, `calculateSlaDeadline`, `PAGE_SIZE`, classes `Prisma*Repository` se apenas instâncias/factories forem usadas ou conectá-las nas rotas/DI via factories), e alinhar `suggestReply` com a rota de sugestão de resposta.
