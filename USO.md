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

Dentro de cada aula expandida existe a seção **Vídeo (via ACP +
HyperFrames)** com um botão **Gerar vídeo**. Ao clicar:

1. O status muda para **Gerando vídeo...** — a tela atualiza sozinha
   (verifica a cada ~8s) sem precisar recarregar a página.
2. Em segundo plano, uma sessão de IA lê o roteiro da aula (e o PDF original,
   como referência extra) e monta/renderiza um vídeo curto usando o
   HyperFrames.
3. **Isso é lento** — pode levar vários minutos, porque instala dependências
   e renderiza de verdade. É por isso que não acontece automaticamente ao
   criar a trilha: fica a critério do admin disparar quando quiser, aula por
   aula.
4. Quando terminar, o status vira **Pronto** (com o vídeo já tocável ali
   mesmo) ou **Falha ao gerar vídeo** (com a mensagem de erro e um botão
   para tentar de novo).

O vídeo gerado também passa a aparecer para o aluno na página da aula,
substituindo o placeholder.

### 5. Acompanhar o progresso dos alunos (`/admin/alunos`)

Lista todos os alunos com o progresso geral (quantas aulas completaram, de
quantas disponíveis). Clique em **Ver detalhes** para abrir o progresso
detalhado de um aluno específico, trilha por trilha e aula por aula (vídeo
assistido? quiz feito? qual nota?).

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

A trilha (texto) e o vídeo de cada aula são gerados via **ACP** (Agent
Client Protocol) — uma sessão do Claude rodando localmente, autenticada com
o login do `claude` já feito na máquina do servidor, sem precisar de nenhuma
API key configurada. É possível trocar para a API da Anthropic ou para um
modelo local via Ollama ajustando `AI_PROVIDER` no `.env` (detalhes no
[README.md](README.md)) — mas nesse caso a geração de vídeo continua
dependendo do ACP, já que é a única forma implementada de rodar o
HyperFrames.

## Notas e limitações

- A geração de texto da trilha e a geração de vídeo por aula rodam dentro do
  processo do servidor (`next dev`/`next start`) — não funcionam em
  ambientes serverless.
- Geração de vídeo é sob demanda, por aula, porque pode levar vários
  minutos; não acontece automaticamente ao criar/refazer a trilha.
- Não há matrícula/pagamento: qualquer aluno autenticado vê todas as
  trilhas publicadas.
