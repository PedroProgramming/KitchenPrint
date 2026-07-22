# KPrint

Sistema web de mesas e pedidos com impressão ESC/POS direta para a Goldensky PO-80.

## Executar no computador da impressora

1. Instale o driver oficial da impressora e deixe a Goldensky PO-80 ligada.
2. Copie `.env.example` para `.env.local` e ajuste `PRINTER_NAME` para o nome exato exibido no Windows. Se deixar vazio, o KPrint usa a impressora padrão.
3. Instale dependências: `npm.cmd install`
4. Rode: `npm.cmd run dev`
5. Abra `http://localhost:3000`.

O endpoint `/api/print` roda no servidor local, gera ESC/POS e envia um único ticket para a impressora padrão, incluindo o corte ao final.

## Produção

Para usar em vários terminais, o site pode ser hospedado em um servidor, mas a impressão USB deve permanecer em um KPrint local na máquina que possui a PO-80 ou ser substituída por uma conexão de rede/serviço de impressão local. O próximo passo natural é adicionar banco de dados e autenticação antes de publicar externamente.
