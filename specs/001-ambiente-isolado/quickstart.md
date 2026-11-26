# Quickstart & Validation Guide: Ambiente Isolado (`001-ambiente-isolado`)

Este guia valida os critérios de aceite de ambiente do `ENUNCIADO.md` (passos 1, 2, 3, 4 e 9 do Fluxo do Avaliador).

## Pré-requisitos

- Linux ou macOS com Bash, Docker (`docker compose`), Git e Node.js >= 22.

## Cenário 1: Subida única + reexecução idempotente (US1, US2)

```bash
# Na raiz de uma cópia limpa (ex.: copia-a)
npm run up
# Conferir saída: API, Front, Banco, Anexos e IA=fake
# Conferir hook ativo:
git config --get core.hooksPath   # esperado: .githooks

# Reexecutar sem derrubar antes (idempotência):
npm run up
# Conferir que termina com código 0 e não duplica usuários nem chamados da seed
```

## Cenário 2: Duas worktrees simultâneas isoladas (US3)

```bash
git worktree add ../copia-b -b teste-worktree-b
cd ../copia-b
npm run up
```

Verificar:
1. Portas de API, Front e Banco, nome do banco/container e pasta de anexos da `copia-b` diferem da `copia-a`.
2. No front da `copia-a`, fazer login como `cliente@balcao.dev` / `Cliente@123`, abrir chamado `"Fatura em dobro, urgente"` / `"Paguei duas vezes a mesma fatura."`, aguardar <= 15s até virar `Financeiro / prioridade Urgente` e anexar um `.txt` pequeno.
3. Confirmar que o anexo foi gravado apenas na pasta `UPLOAD_DIR` da `copia-a` (e não na da `copia-b`).
4. No front da `copia-b`, fazer login com o mesmo cliente: o chamado da `copia-a` não aparece; criar um novo chamado em `copia-b` e confirmar triagem independente.

## Cenário 3: Contrato caixa-preta em ambas as cópias (US3)

```bash
cd blackbox && npm ci
API_URL=<API_COPIA_A> npm test
API_URL=<API_COPIA_B> npm test
```

Ambos devem passar 100% sem nenhuma chave de IA configurada.

## Cenário 4: Derrubada isolada e recuperação (US4)

```bash
# Na copia-b:
npm run down

# Confirmar que copia-a segue saudável:
curl -fsS <API_COPIA_A>/api/health

# Subir copia-b novamente sem erro:
npm run up

# Encerrar ambas e remover worktree temporária:
npm run down
cd ../copia-a && npm run down
git worktree remove ../copia-b && git branch -D teste-worktree-b
```
