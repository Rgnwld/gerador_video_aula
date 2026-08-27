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
  local) — configurável pelo admin em `/admin/configuracoes` (a UI
  sobrepõe as variáveis de ambiente, sem precisar reiniciar o servidor)
- Geração de vídeo real por aula: pipeline determinístico (não um agente
  autônomo) que usa o CLI do HyperFrames diretamente — o servidor faz o
  scaffold e a renderização por conta própria (`child_process`), e chama o
  provedor de IA configurado pelo admin **apenas** para uma única geração
  de texto estruturado (design system + storyboard de cenas), que vira uma
  composição HTML montada por um template fixo. Funciona com qualquer
  provedor (ACP, Anthropic ou Ollama) — reflete sempre o que está
  selecionado em `/admin/configuracoes`
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

   `AI_PROVIDER` (e as demais variáveis de IA) no `.env` são só o valor
   padrão inicial — o admin pode trocar o provedor e configurá-lo
   inteiramente pela UI, em `/admin/configuracoes`, a qualquer momento e
   sem reiniciar o servidor:
   - **ACP** (padrão): usa o Claude local via Agent Client Protocol
     (`@agentclientprotocol/claude-agent-acp`). Não precisa de nenhuma API
     key — reaproveita o login do `claude` CLI já feito na máquina onde o
     servidor roda.
   - **Anthropic API**: precisa de uma API key (configurável na própria
     tela).
   - **Ollama**: aponte para a URL do servidor Ollama (local ou remoto) e
     escolha o modelo — a tela tem um botão "Buscar modelos instalados"
     que lista os modelos já baixados naquele Ollama. Não precisa de API
     key, mas precisa do Ollama rodando (`ollama serve`) com pelo menos um
     modelo baixado (`ollama pull llama3.1`, por exemplo).

   Os três funcionam tanto para o texto da trilha quanto para o roteiro do
   vídeo — a geração de vídeo em si (scaffold + render) roda sempre
   diretamente no servidor, sem depender de um provedor específico.

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
   HyperFrames (assíncrono — o status atualiza sozinho na tela; leva
   menos de dois minutos, tipicamente).
3. Acompanhe o progresso de cada aluno em `/admin/alunos`.
4. Troque o provedor de IA (e suas configurações) a qualquer momento em
   `/admin/configuracoes`.
5. Login/cadastro como aluno → veja as trilhas disponíveis, assista
   (marque como assistida) cada aula, responda o quiz e acompanhe seu
   progresso.

## Limitações conhecidas do MVP

- Geração de vídeo é sob demanda por aula (não acontece automaticamente ao
  criar/refazer a trilha). Roda em segundo plano dentro do processo do
  `next dev`/`next start`; **não funciona em ambientes serverless** (a
  função terminaria antes do fim do render). O mesmo vale para a geração
  de texto da trilha, que roda de forma síncrona na requisição.
- O provider `"acp"` depende do `claude` CLI estar autenticado na máquina
  onde o servidor roda.
- A geração de vídeo depende do CLI `hyperframes` (`npx hyperframes`) e do
  Chrome/ffmpeg que ele usa por baixo dos panos estarem disponíveis no
  ambiente do servidor.
- Não há matrícula/pagamento: todo aluno autenticado vê todas as trilhas
  publicadas (status "Pronta").
