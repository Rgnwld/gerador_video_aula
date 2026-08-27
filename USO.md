# Guia de Utilização — Plataforma de Cursos

Este guia explica como usar a plataforma no dia a dia, tanto como **administrador**
quanto como **aluno**. Para instruções de instalação/setup do projeto, veja o
[README.md](README.md).

## Contas de teste (criadas pelo seed)

| Papel  | Email                    | Senha      |
|--------|--------------------------|------------|
| Admin  | `admin@plataforma.com`   | `admin123` |
| Aluno  | `aluno@plataforma.com`   | `aluno123` |

Novos alunos também podem se cadastrar sozinhos em `/registro`. Contas de
administrador só são criadas manualmente (via seed ou direto no banco).

---

## Fluxo do Administrador

### 1. Login

Acesse `/login` e entre com uma conta de papel `ADMIN`. Você cai no painel em
`/admin`, que lista todas as trilhas já criadas com o status de cada uma:

- **Pronta** — geração concluída, aparece para os alunos.
- **Gerando...** — a IA ainda está processando o PDF.
- **Falhou** — a geração deu erro (o motivo aparece na página da trilha).

### 2. Criar uma trilha nova

Em `/admin/trilhas/novo`, preencha:

- **Título** e **descrição** da trilha.
- **Perguntas por aula** — quantas perguntas de múltipla escolha a IA deve
  gerar para cada aula (padrão: 3).
- **PDF do conteúdo** — o material profissional que servirá de base. A IA lê
  esse arquivo diretamente (não é só um texto extraído) e o divide em aulas
  ordenadas da mais fácil para a mais difícil.

Ao clicar em **Criar trilha**, a requisição fica "pendurada" até a IA
terminar (pode levar de alguns segundos a poucos minutos, dependendo do
tamanho do PDF) e então já te leva para a página de edição da trilha, com as
aulas geradas.

### 3. Editar uma trilha (`/admin/trilhas/[id]`)

Nessa página dá para:

- **Editar título/descrição** da trilha.
- **Refazer trilha** — reprocessa o conteúdo com a IA, substituindo todas as
  aulas e perguntas atuais. Opcionalmente, envie um novo PDF para trocar o
  material de origem; se não enviar nada, reaproveita o PDF já salvo.
- **Editar cada aula** (clique para expandir): título, resumo e roteiro do
  vídeo são todos editáveis manualmente.
- **Editar perguntas** de cada aula: texto, as 4 alternativas e qual é a
  correta (marcada pelo botão de rádio). Dá para adicionar ou remover
  perguntas livremente.
- **Gerar vídeo** (por aula) — veja a seção seguinte.

### 4. Gerar vídeo de uma aula

Dentro de cada aula expandida existe a seção **Vídeo (HyperFrames)** com um
botão **Gerar vídeo**. Ao clicar:

1. O status muda para **Gerando vídeo...** — a tela atualiza sozinha
   (verifica a cada ~8s) sem precisar recarregar a página.
2. Em segundo plano, o servidor roda um pipeline em 3 passos: (a) monta o
   projeto HyperFrames a partir do roteiro da aula usando o CLI diretamente
   (sem IA); (b) faz **uma única chamada** ao provedor de IA configurado
   em Configurações para gerar um design system simples (paleta) e um
   storyboard curto (4 a 8 cenas de texto); (c) escreve a composição HTML
   e renderiza o vídeo via CLI. Normalmente leva menos de dois minutos.
3. Enquanto está gerando, aparece um botão **Cancelar geração** — encerra o
   processo de verdade (não só esconde na tela) e libera a aula para tentar
   de novo.
4. Quando terminar, o status vira **Pronto** (com o vídeo já tocável ali
   mesmo) ou **Falha ao gerar vídeo** (com a mensagem de erro — inclusive
   quando cancelado — e um botão para tentar de novo). É por isso que não
   acontece automaticamente ao criar a trilha: fica a critério do admin
   disparar quando quiser, aula por aula.

O vídeo gerado também passa a aparecer para o aluno na página da aula,
substituindo o placeholder.

### 5. Acompanhar o progresso dos alunos (`/admin/alunos`)

Lista todos os alunos com o progresso geral (quantas aulas completaram, de
quantas disponíveis). Clique em **Ver detalhes** para abrir o progresso
detalhado de um aluno específico, trilha por trilha e aula por aula (vídeo
assistido? quiz feito? qual nota?).

### 6. Configurar o provedor de IA (`/admin/configuracoes`)

O admin escolhe e configura, direto pela interface (sem precisar mexer em
arquivo nenhum nem reiniciar o servidor), qual IA gera o texto das trilhas
**e** o design system/storyboard de cada vídeo:

- **ACP (Claude local)** — não pede nada, usa o login do `claude` já feito
  na máquina do servidor.
- **Anthropic API** — precisa preencher a API key (e opcionalmente trocar o
  modelo).
- **Ollama (modelo local)** — preencha a URL do servidor Ollama e clique em
  **Buscar modelos instalados** para listar os modelos já baixados naquele
  Ollama e escolher um numa lista, em vez de digitar o nome manualmente.

Os três funcionam tanto para gerar a trilha quanto para gerar vídeo — a
montagem e a renderização em si (scaffold + CLI do HyperFrames) rodam
sempre no servidor, independente do provedor escolhido.

Clique em **Salvar configurações** — a mudança já vale para a próxima
trilha (ou vídeo) gerado.

---

## Fluxo do Aluno

### 1. Login / cadastro

Em `/login` (ou `/registro` para criar conta nova). Alunos caem no dashboard
em `/aluno`.

### 2. Ver trilhas disponíveis

O dashboard lista todas as trilhas com status "Pronta", cada uma com uma
barra de progresso (% de aulas concluídas). Clique numa trilha para ver a
lista de aulas, cada uma com um indicador de dificuldade e o status
individual (vídeo assistido / quiz feito).

### 3. Assistir uma aula e responder o quiz

Na página da aula (`/aluno/trilhas/[id]/aulas/[id]`):

1. Leia o **resumo** da aula.
2. Assista ao **vídeo** (se já foi gerado pelo admin) e clique em **Marcar
   vídeo como assistido**. Se ainda não há vídeo gerado, aparece um
   placeholder no lugar.
3. Responda as **questões da aula** (múltipla escolha) e clique em **Enviar
   respostas** — a nota (%) aparece na hora.

Uma aula só conta como "concluída" para efeito de progresso quando os dois
passos (vídeo assistido + quiz respondido) estão feitos.

### 4. Acompanhar o próprio progresso

A barra de progresso no dashboard (`/aluno`) e na página de cada trilha
reflete em tempo real quantas aulas foram concluídas.

---

## Provedor de IA usado na geração

Por padrão, a trilha (texto) e o design system/storyboard do vídeo de cada
aula são gerados via **ACP** (Agent Client Protocol) — uma sessão do Claude
rodando localmente, autenticada com o login do `claude` já feito na máquina
do servidor, sem precisar de nenhuma API key configurada. O admin pode
trocar o provedor (Anthropic API ou Ollama) em `/admin/configuracoes` —
veja a seção 6 do fluxo do administrador acima — e a mudança vale tanto
para a trilha quanto para o vídeo.

A montagem do projeto HyperFrames e a renderização em si (o CLI
`hyperframes`) rodam sempre diretamente no servidor via `child_process`,
sem depender de nenhum provedor de IA — é por isso que a geração de vídeo
funciona igual com qualquer um dos três provedores selecionados.

## Notas e limitações

- A geração de texto da trilha e a geração de vídeo por aula rodam dentro do
  processo do servidor (`next dev`/`next start`) — não funcionam em
  ambientes serverless.
- Geração de vídeo é sob demanda, por aula (leva tipicamente menos de dois
  minutos); não acontece automaticamente ao criar/refazer a trilha.
- Não há matrícula/pagamento: qualquer aluno autenticado vê todas as
  trilhas publicadas.
