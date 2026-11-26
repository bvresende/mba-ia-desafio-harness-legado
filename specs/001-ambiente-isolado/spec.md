# Feature Specification: Ambiente Isolado e Idempotente por Cópia

**Feature Branch**: `001-ambiente-isolado`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Implementar o Pilar 1 do desafio Balcão: ambiente que sobe inteiro com um único comando a partir de um clone limpo, reexecuta de forma idempotente sem duplicar a seed, suporta múltiplas cópias (worktrees) simultâneas totalmente isoladas em portas, banco, anexos e worker, e derruba cada cópia sem afetar as demais, preservando o contrato atual do sistema."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subida completa a partir de clone limpo (Priority: P1)

Como desenvolvedor ou agente de código entrando em um clone limpo do repositório, quero executar um único comando de subida para que o sistema inteiro (serviço de API, processador de triagem em segundo plano, interface web, banco de dados migrado e dados iniciais) fique pronto para uso sem nenhum passo manual adicional, exibindo claramente onde acessar cada componente daquela cópia.

**Why this priority**: É a base do harness de ambiente. Sem subida autônoma de ponta a ponta em um único comando, nenhum agente consegue iniciar e validar trabalho sem intervenção humana.

**Independent Test**: Clonar o repositório em uma pasta vazia, executar apenas o comando de subida e verificar que o comando retorna sucesso, imprime os endereços da API e da interface web, o identificador/conexão do banco e a pasta de anexos, e permite autenticar com as contas padrão e processar chamados automaticamente sem chave externa de IA.

**Acceptance Scenarios**:

1. **Given** um clone limpo do repositório sem dependências instaladas nem arquivos de configuração local, **When** o comando de subida é executado, **Then** todas as dependências são instaladas, o banco de dados é inicializado e migrado, os dados iniciais são carregados, e a API, o worker de triagem e a interface web ficam em execução e saudáveis.
2. **Given** a subida concluída com sucesso, **When** a saída do comando é lida, **Then** ela informa explicitamente o endereço da API, o endereço da interface web, a identificação/endereço do banco de dados e o caminho absoluto da pasta de anexos pertencentes àquela cópia.
3. **Given** o ambiente recém-subido sem nenhuma chave externa de IA configurada, **When** um usuário abre a interface web e faz login com qualquer uma das três contas iniciais (`admin@balcao.dev`, `agente@balcao.dev`, `cliente@balcao.dev`), **Then** o acesso funciona normalmente e um chamado criado pelo cliente é triado automaticamente em modo simulado (fake).
4. **Given** um clone limpo recém-inicializado pelo comando de subida, **When** a configuração de hooks locais do controle de versão é inspecionada, **Then** o hook de pré-commit do repositório já está ativo sem exigir nenhum comando extra do usuário.

---

### User Story 2 - Reexecução idempotente da subida (Priority: P1)

Como desenvolvedor ou agente, quero poder rodar o comando de subida novamente sobre uma cópia que já está no ar (ou parcialmente no ar), sem derrubá-la antes, para garantir que o ambiente esteja íntegro sem falhar nem duplicar registros iniciais.

**Why this priority**: Agentes frequentemente executam o comando de bootstrap no início de cada tarefa ou após quedas parciais. Se a subida quebrar ou duplicar dados na segunda tentativa, o fluxo automatizado trava.

**Independent Test**: Com a cópia já no ar após a primeira subida, executar o comando de subida uma segunda vez consecutiva; verificar saída com sucesso, mesmas contas funcionando no login e quantidade inalterada de usuários, chamados e respostas iniciais.

**Acceptance Scenarios**:

1. **Given** uma cópia já inicializada e em execução, **When** o comando de subida é executado novamente sem derrubada prévia, **Then** o comando finaliza com sucesso, mantém a API, o worker e a interface web saudáveis e imprime novamente os endereços, banco e pasta de anexos da cópia.
2. **Given** a segunda execução da subida concluída, **When** os dados do banco são consultados e as contas iniciais fazem login, **Then** as três contas padrão continuam funcionando e não existem usuários, chamados ou respostas iniciais duplicados.
3. **Given** uma cópia em execução onde um dos processos em segundo plano (ex.: o worker ou a API) foi encerrado inesperadamente, **When** o comando de subida é executado novamente, **Then** o processo ausente é restaurado sem reiniciar nem corromper os dados existentes.

---

### User Story 3 - Execução simultânea de múltiplas cópias isoladas (Priority: P1)

Como time com vários agentes trabalhando em paralelo em diferentes worktrees do mesmo repositório, quero subir duas ou mais cópias ao mesmo tempo na mesma máquina sem qualquer conflito de porta, banco de dados, pasta de anexos ou worker de triagem.

**Why this priority**: É o problema central que bloqueou o time no cenário do desafio; sem isolamento real por cópia, o desenvolvimento paralelo por agentes é inviável.

**Independent Test**: Com a cópia A no ar, criar uma worktree B e rodar o comando de subida em B sem derrubar A; confirmar que portas, banco e pasta de anexos diferem entre A e B, criar chamado + anexo em A, confirmar triagem e armazenamento apenas em A, confirmar ausência em B, criar chamado em B e confirmar triagem em B, e validar o contrato completo da API contra ambas.

**Acceptance Scenarios**:

1. **Given** a cópia A em execução, **When** uma segunda cópia B (worktree) executa o comando de subida, **Then** a cópia B sobe sem erros usando portas de API, interface web e banco distintas das da cópia A, além de um banco de dados e uma pasta de anexos próprios.
2. **Given** as cópias A e B rodando simultaneamente, **When** o cliente faz login na interface web da cópia A, cria um chamado com título `"Fatura em dobro, urgente"` e descrição `"Paguei duas vezes a mesma fatura."` e anexa um arquivo de texto, **Then** o chamado é triado automaticamente em até 15 segundos como categoria Financeiro e prioridade Urgente, e o arquivo anexado aparece exclusivamente na pasta de anexos informada pela cópia A.
3. **Given** o chamado e anexo criados na cópia A, **When** o mesmo cliente faz login na interface web da cópia B, **Then** o chamado da cópia A não aparece na cópia B, e um novo chamado criado em B é triado de forma independente pelo worker da cópia B.
4. **Given** as cópias A e B simultaneamente no ar sem chaves externas de IA, **When** a suíte de testes caixa-preta do repositório base é executada contra o endereço da API de A e depois contra o endereço da API de B, **Then** todos os testes passam em ambas as cópias sem nenhuma alteração no contrato de respostas.

---

### User Story 4 - Derrubada isolada de uma cópia (Priority: P2)

Como desenvolvedor ou agente encerrando uma sessão de trabalho, quero executar um único comando de derrubada em uma cópia para encerrar todos os serviços e o banco que aquela cópia iniciou, sem interferir em nenhuma outra cópia em execução.

**Why this priority**: Permite ciclo completo de vida de ambientes efêmeros (subir, testar, descartar worktree) liberando recursos sem causar efeito colateral em agentes paralelos.

**Independent Test**: Com as cópias A e B em execução, rodar o comando de derrubada em B; verificar que todos os processos e o banco de B foram encerrados, que a cópia A continua respondendo normalmente em seu endpoint de saúde, e que B pode subir novamente sem erro.

**Acceptance Scenarios**:

1. **Given** as cópias A e B rodando simultaneamente, **When** o comando de derrubada é executado na cópia B, **Then** a API, o worker, a interface web e a instância de banco iniciados pela cópia B são encerrados, enquanto a cópia A continua totalmente operacional e respondendo em seu endpoint de saúde.
2. **Given** a cópia B derrubada, **When** o comando de subida é executado novamente na cópia B, **Then** a cópia B volta a subir sem erro e responde normalmente.
3. **Given** uma cópia já parada (ou nunca inicializada), **When** o comando de derrubada é executado nela, **Then** o comando encerra sem erro e sem afetar outras cópias ativas.

---

### Edge Cases

- **Portas padrão já ocupadas**: Quando as portas habituais (ex.: 4000, 5173 ou 5432) já estiverem ocupadas por outro serviço na máquina ou por outra cópia, a subida escolhe portas livres automaticamente sem falhar nem encerrar processos externos.
- **Caminhos de worktree com nomes variados**: Diretórios de worktree com maiúsculas, pontos, espaços ou nomes iguais em diretórios pais diferentes geram identificadores de instância distintos e válidos sem colisão entre cópias.
- **CORS com porta dinâmica**: Como a interface web pode rodar em qualquer porta livre, a API aceita requisições provenientes da origem exata da interface web daquela cópia (inclusive `localhost` e `127.0.0.1` na porta alocada).
- **Encerramento limpo após erro parcial**: Se um processo da cópia já tiver morrido com arquivo de estado/PID obsoleto, tanto a nova subida quanto a derrubada tratam o estado obsoleto com segurança sem matar processos não relacionados.
- **Preservação do comportamento da API e dos testes unitários**: Centralizar ou tornar dinâmica a configuração de ambiente não pode quebrar a execução dos testes unitários da API quando executados sem banco de dados ou sem arquivo local de ambiente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar um único comando raiz de subida capaz de preparar e iniciar banco de dados, migrações, carga inicial de dados, API, worker de triagem e interface web a partir de um clone limpo, sem nenhum passo manual adicional.
- **FR-002**: O comando de subida DEVE aguardar até que banco, API, worker e interface web estejam efetivamente prontos e saudáveis antes de finalizar com código de saída zero.
- **FR-003**: Ao concluir com sucesso, o comando de subida DEVE exibir claramente: endereço da API, endereço da interface web, identificação/endereço do banco de dados e caminho da pasta de anexos da cópia atual.
- **FR-004**: O comando de subida DEVE ser idempotente: executá-lo repetidamente em uma cópia já no ar (sem derrubar antes) DEVE terminar sem erro, mantendo os serviços saudáveis e sem duplicar usuários, chamados ou respostas da carga inicial.
- **FR-005**: A carga inicial de dados DEVE preservar integralmente as três contas padrão (`admin@balcao.dev` / `Admin@123`, `agente@balcao.dev` / `Agente@123`, `cliente@balcao.dev` / `Cliente@123`) e os chamados iniciais sem falhar nem multiplicar registros em execuções repetidas.
- **FR-006**: Cada cópia/worktree DEVE receber um identificador único derivado de sua localização no sistema de arquivos e isolar completamente: instância dedicada de banco de dados, porta do banco, porta da API, porta da interface web, pasta de anexos e processos de API, worker e interface web.
- **FR-007**: A interface web de cada cópia DEVE se comunicar exclusivamente com a API da mesma cópia, e a API DEVE permitir requisições cross-origin vindas da interface web da mesma cópia.
- **FR-008**: O worker de triagem DEVE rodar como processo separado da API, conectado exclusivamente ao banco de dados da própria cópia, com modo de IA simulado (`fake`) ativo por padrão sem exigir nenhuma chave externa, e suportar encerramento limpo ao receber sinal de término.
- **FR-009**: O sistema DEVE disponibilizar um único comando raiz de derrubada que encerra todos os processos (API, worker, interface web) e a instância de banco iniciados pela cópia atual, sem afetar processos ou bancos de outras cópias.
- **FR-010**: O comando de subida DEVE configurar automaticamente o hook de pré-commit do controle de versão na cópia atual, sem exigir passos extras do usuário após o clone.
- **FR-011**: Nenhuma rota HTTP, formato de resposta, código de status, código de erro ou estrutura de pastas fixas do sistema PODE ser alterada em relação ao comportamento original validado pela suíte caixa-preta.
- **FR-012**: A instalação automática de dependências durante a subida DEVE respeitar os lockfiles versionados sem reescrevê-los desnecessariamente.

### Key Entities

- **Instância de Cópia (Worktree Instance)**: Representa uma cópia isolada do repositório no disco, identificada por um slug determinístico único, contendo suas portas alocadas (banco, API, front), nome do projeto do banco dedicado, pasta exclusiva de anexos, arquivos de configuração gerados e estado de execução (PIDs e logs locais).
- **Estado de Execução Local**: Metadados efêmeros e ignorados pelo controle de versão que registram as portas, caminhos e identificadores de processos iniciados por aquela cópia para permitir reexecução idempotente e derrubada isolada.
- **Dados Iniciais (Seed)**: Conjunto mínimo de 3 contas padrão (admin, atendente, cliente) e chamados de exemplo que devem existir exatamente uma vez por banco isolado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir de um clone limpo, 100% dos componentes (banco migrado, seed, API, worker e interface web) entram em operação com 1 único comando de subida, sem intervenção manual.
- **SC-002**: Reexecutar o comando de subida imediatamente após uma subida bem-sucedida termina com código de saída zero e produz 0 registros duplicados no banco de dados.
- **SC-003**: Duas worktrees simultâneas operam com 100% de recursos distintos (0 portas compartilhadas, 0 compartilhamento de banco, 0 compartilhamento de pasta de anexos e workers independentes).
- **SC-004**: Um chamado criado na interface web de qualquer uma das duas cópias simultâneas tem sua triagem concluída automaticamente em até 15 segundos, com anexos gravados exclusivamente na pasta da cópia de origem.
- **SC-005**: 100% dos testes da suíte caixa-preta do repositório base passam contra ambas as cópias em execução simultânea, sem nenhuma chave de IA configurada.
- **SC-006**: Derrubar uma cópia encerra 100% dos seus processos e container de banco mantendo 100% de disponibilidade da outra cópia ativa (verificada pelo endpoint de saúde).

## Assumptions

- O ambiente de execução dispõe de Linux ou macOS, Bash, Docker (com plugin `docker compose`), Git e Node.js LTS (>= 22), conforme restrições do desafio.
- Os arquivos efêmeros de runtime por cópia (`.env` gerados, PIDs, logs, pasta de anexos local e estado da instância) ficam ignorados no `.gitignore` para preservar `git status` limpo após a subida.
- O hook de pré-commit será ativado pelo comando de subida apontando para o diretório versionado de hooks do repositório (ex.: `.githooks`), executando uma verificação leve/passthrough até que a Spec 002 instale os gates completos de tipo e lint.
- Os testes de integração existentes continuam preservados e compatíveis com a estrutura de configuração, embora não sejam cobrados diretamente pela subida padrão.
