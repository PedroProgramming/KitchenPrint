# KitchenPrint - notas para agentes

## Combinado de trabalho

- Usar esta pasta para registrar contexto importante do projeto conforme ele for sendo descoberto.
- Preservar mudancas locais do usuario. No momento observado: `package-lock.json` estava modificado localmente.
- Preferir anotar decisoes praticas, pontos de risco e comandos uteis, em vez de documentacao longa.

## Contexto do projeto

- Aplicacao Next.js chamada `kprint`.
- Scripts principais em `package.json`:
  - `npm.cmd run dev`: inicia o Next em modo desenvolvimento com webpack.
  - `npm.cmd run build`: build de producao.
  - `npm.cmd run print-agent`: roda o agente local de impressao.
- Banco/autenticacao usam Supabase. Arquivos SQL ficam em `supabase/`.
- Impressao de cozinha usa ESC/POS e esta concentrada principalmente em `lib/escpos.ts`, `lib/print.ts`, `scripts/print-raw.ps1` e `scripts/print-agent.mjs`.
- O README indica foco em impressora Goldensky PO-80 no Windows.

## Pontos tecnicos ja observados

- `lib/escpos.ts` monta o ticket da cozinha em bytes ESC/POS.
- O texto do ticket e limpo para ASCII antes de imprimir, removendo acentos e caracteres fora da faixa imprimivel.
- O horario do ticket usa timezone `America/Sao_Paulo`.
- O pull mais recente aplicado foi fast-forward de `155aadd` para `f467d9a`, alterando `lib/escpos.ts`.
- A tela `/pratos` permite cadastrar, editar e remover pratos/bebidas do cardapio via `/api/menu`.
- A remocao de item do cardapio usa `delete` em `menu_items`; pedidos e historico guardam os itens em JSON, entao nao dependem da linha do cardapio para exibir o que ja foi vendido.
- A remocao na tela `/pratos` usa modal proprio de confirmacao e botoes de acao com icones, nao `confirm()` do navegador.
- A dashboard em `/dashboard` aceita filtros por periodo (`from`/`to`) e mostra ranking de pratos com quantidade total, vezes pedido e mesas em que apareceu.
- O card "Em atendimento" da dashboard deve refletir mesas realmente ocupadas em `table_orders`, igual ao mapa de mesas, e nao sessoes antigas abertas em `service_sessions`.

## Cuidados

- Evitar mexer em `.env`, logs, `.next`, `.vercel`, `node_modules` e artefatos gerados sem necessidade.
- Antes de alterar fluxo de impressao, verificar o impacto no Windows e no nome/configuracao da impressora.
- Antes de mexer em schema ou migracoes Supabase, ler os SQLs existentes para manter compatibilidade.

## Pendencias / proximos pedidos

- Quando estiver no computador da empresa, localizar o projeto do site do Azulao e usar as cores base dele como referencia para aplicar a paleta visual neste projeto.
- Antes de aplicar a paleta do Azulao, identificar as cores exatas no projeto original, preferencialmente em CSS, Tailwind config, tokens, variaveis ou componentes compartilhados.
- Quando juntar os dois sistemas, criar uma area para funcionarios montarem uma lista do que precisa comprar.
- A lista de compras e uma demanda importante dos donos porque hoje a equipe esquece itens com frequencia; tratar como fluxo operacional central, nao como detalhe secundario.
- Ideia inicial para lista de compras: funcionarios adicionam item, quantidade, unidade, prioridade/urgencia, observacao e quem solicitou; administradores/donos conseguem marcar comprado, cancelar ou acompanhar pendencias.

## Referencia visual do Azulao

- Projeto de referencia: `C:\Users\PDV01\Desktop\Azulao`.
- A paleta principal esta declarada em `index.html` no `tailwind.config`: ink `#101722`, navy `#192548`, blue `#176DB6`, light `#EAF4FF`, cream `#FFF8EC` e gold `#D89A3D`.
- A pagina `cardapio.html` refina os tokens para uso em interfaces: ink `#0B1726`, navy `#102B4E`, blue `#176DB6`, sky `#E9F4FF`, cream `#FFF9EE`, gold `#F0AD43`, line `#DBE4EC`, white `#FFFFFF` e muted `#607080`.
- Direcao visual observada: fundo creme claro, superficies brancas, navegacao/cabecalhos em azul-marinho quase preto, azul vivo para acoes primarias, dourado para destaque/CTA, tipografia sans-serif para interface e Georgia/serif para titulos.
- Efeitos recorrentes: bordas suaves, sombras amplas e discretas, fundos escuros translucidos com blur e detalhes circulares/dourados em areas hero.
- Em 24/07/2026, a paleta foi aplicada ao KitchenPrint em `app/globals.css`, `app/tailwind.css` e `app/occupied.css`; o build de producao passou.
- O nome atual `KPrint` ainda permanece na interface ate a definicao do novo nome comercial.
- O lançamento de itens no pedido agora aceita digitação livre do nome do prato/bebida em `app/order-panel.tsx`; o cadastro do cardápio continua disponível separadamente em `/pratos`.
