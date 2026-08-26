# Plataforma de Cursos

MVP de uma plataforma de cursos com área do aluno e área administrativa. O
diferencial é a criação de **trilhas**: o administrador envia um PDF sobre um
tema profissional e a IA (Claude) divide o conteúdo em aulas detalhadas,
ordenadas por dificuldade — cada uma com resumo escrito, roteiro de vídeo,
um número configurável de perguntas (padrão 3) e, opcionalmente, um vídeo
real gerado sob demanda via HyperFrames.

## Stack

- Next.js 15 (App Router) + TypeScript
- SQLite + Prisma (banco em arquivo local, sem necessidade de servidor de banco)
- NextAuth (credenciais) para autenticação com papéis ADMIN/STUDENT
- IA para geração das trilhas: **ACP** (Claude local via Agent Client
  Protocol, padrão), **Anthropic API (Claude)** ou **Ollama** (modelo
  local), configurável via `AI_PROVIDER`
- Geração de vídeo real por aula: sessão ACP com acesso a Bash/arquivos
  que usa a skill do HyperFrames para montar e renderizar o vídeo
- Tailwind CSS

## Setup local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o `.env.example` para `.env` e preencha `NEXTAUTH_SECRET` (pode
   gerar um com `openssl rand -base64 32`):

   ```bash
   cp .env.example .env
   ```

   Escolha o provedor de IA em `AI_PROVIDER`:
   - `"acp"` (padrão): usa o Claude local via Agent Client Protocol
     (`@agentclientprotocol/claude-agent-acp`). Não precisa de nenhuma API
     key — reaproveita o login do `claude` CLI já feito na máquina onde o
     servidor roda. É o mesmo mecanismo usado para gerar os vídeos.
   - `"anthropic"`: preencha `ANTHROPIC_API_KEY`.
   - `"ollama"`: rode o Ollama localmente (`ollama serve`), baixe um modelo
     (ex: `ollama pull llama3.1`) e ajuste `OLLAMA_BASE_URL`/`OLLAMA_MODEL`
     se necessário. Não precisa de API key.

3. Rode as migrações e o seed (cria um admin e um aluno de teste, e o arquivo
   `prisma/dev.db`):

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

   Credenciais criadas pelo seed:
   - Admin: `admin@plataforma.com` / `admin123`
   - Aluno: `aluno@plataforma.com` / `aluno123`

5. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

6. Acesse `http://localhost:3000`.

## Fluxo principal

1. Login como admin → **Nova trilha** → envie um PDF, defina o número de
   perguntas por aula → a IA gera as aulas (resumo, roteiro de vídeo e
   perguntas) automaticamente.
2. Edite qualquer aula/pergunta gerada em `/admin/trilhas/[id]`, ou use
   **Refazer trilha** para reprocessar o conteúdo com a IA. Em cada aula
   dá para clicar **Gerar vídeo** para renderizar um vídeo real via
   HyperFrames (assíncrono — o status atualiza sozinho na tela).
3. Acompanhe o progresso de cada aluno em `/admin/alunos`.
4. Login/cadastro como aluno → veja as trilhas disponíveis, assista
   (marque como assistida) cada aula, responda o quiz e acompanhe seu
   progresso.

## Limitações conhecidas do MVP

- Geração de vídeo é sob demanda por aula (não acontece automaticamente ao
  criar/refazer a trilha) porque pode levar vários minutos — instala
  dependências e renderiza de verdade via HyperFrames. Roda em segundo
  plano dentro do processo do `next dev`/`next start`; **não funciona em
  ambientes serverless** (a função terminaria antes do fim do render). O
  mesmo vale para a geração de texto via provider `"acp"`/`"anthropic"`,
  que roda de forma síncrona na requisição.
- O provider `"acp"` (texto e vídeo) depende do `claude` CLI estar
  autenticado na máquina onde o servidor roda.
- Não há matrícula/pagamento: todo aluno autenticado vê todas as trilhas
  publicadas (status "Pronta").
