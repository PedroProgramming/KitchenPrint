# KitchenPrint - plano de redesign visual

## Objetivo

Modernizar a interface do KitchenPrint depois da conclusão e validação do fluxo de listas. O redesign deve melhorar a leitura, a velocidade de operação e a experiência em telas de computador, tablet e celular, sem prejudicar o uso rápido no atendimento.

## Escopo visual

- Padronizar páginas, menus, cabeçalhos, cards, tabelas e modais.
- Modernizar `input`, `select`, `textarea`, botões e mensagens de validação.
- Usar Tailwind CSS como base, aproveitando componentes e classes existentes.
- Criar estados visuais claros para carregamento, vazio, sucesso, erro, foco, desabilitado e hover.
- Melhorar responsividade e acessibilidade, especialmente contraste, foco por teclado, labels e áreas de toque.
- Aplicar a mesma linguagem visual em pedidos/mesas, listas, pratos/bebidas e dashboard.

## Direção visual

- Aparência moderna, limpa e operacional, com boa densidade de informação.
- Fundo claro em creme ou azul muito suave, superfícies brancas e navegação escura.
- Cantos arredondados moderados, bordas discretas e sombras amplas porém suaves.
- Hierarquia baseada em títulos fortes, subtítulos curtos, badges e números destacados.
- Ícones consistentes para navegação e ações; evitar emojis quando houver ícone adequado.
- Animações curtas e discretas apenas para feedback, abertura de menus e mudança de estado.

## Paleta de referência

Usar a identidade já observada no projeto Azulao como referência, confirmando os tokens antes da aplicação final:

- Ink: `#0B1726` ou `#101722`
- Navy: `#102B4E` ou `#192548`
- Blue: `#176DB6`
- Sky/light: `#E9F4FF` ou `#EAF4FF`
- Cream: `#FFF9EE` ou `#FFF8EC`
- Gold: `#F0AD43` ou `#D89A3D`
- Line: `#DBE4EC`
- Muted: `#607080`
- White: `#FFFFFF`

As cores de estado devem ser reservadas para significado: verde para concluído/sucesso, vermelho para erro/urgente, âmbar para atenção e azul para informação.

## Componentes a criar ou padronizar

1. `Button`: variantes primária, secundária, danger, ghost e loading.
2. `FormField`: label, ajuda, erro, foco e estado desabilitado.
3. `Input`, `Select` e `Textarea`: altura e espaçamento uniformes, placeholder legível e foco acessível.
4. `Card`: superfície, título, descrição, conteúdo e ações.
5. `Badge`: prioridade, status, cargo e área.
6. `EmptyState`: mensagem, ícone e ação recomendada.
7. `Toast` ou alertas de feedback para operações concluídas ou falhas.
8. `Modal`: confirmação de ações destrutivas e edição.
9. `PageHeader`: título, descrição, breadcrumbs opcionais e ações.
10. `Sidebar`/navegação: item ativo, versão desktop, menu mobile e indicação do usuário/cargo.

## Regras específicas da lista de compras

- Usuário comum deve ver a área correspondente ao seu cargo automaticamente.
- Administrador deve visualizar as três áreas com contadores e filtros fáceis de entender.
- Destacar itens urgentes sem depender apenas de cor; usar badge e texto.
- Mostrar claramente item, quantidade, unidade, observação, solicitante, área e data.
- Deixar as ações de comprar/cancelar visíveis para o administrador, com confirmação quando necessário.
- Usar cards no celular e tabela ou grid organizado em telas maiores.

## Ordem sugerida de aplicação

1. Consolidar tokens de cor, tipografia, espaçamento, raios e sombras.
2. Criar componentes visuais compartilhados.
3. Modernizar Sidebar e cabeçalho mobile.
4. Modernizar a tela de listas, incluindo formulários e estados vazios.
5. Aplicar o padrão em pratos/bebidas e pedidos/mesas.
6. Aplicar o padrão na dashboard.
7. Revisar acessibilidade, responsividade e estados de erro/loading.
8. Executar `npm.cmd run build` e revisar visualmente as rotas principais.

## Cuidados

- Não alterar regras de autenticação, permissões ou persistência durante o redesign sem necessidade.
- Preservar o fluxo rápido de lançamento de pedidos e itens.
- Não remover dados ou funcionalidades existentes para obter uma interface mais simples.
- Manter textos em português e corrigir problemas de codificação ao tocar nos arquivos antigos.
- Validar a experiência com usuário administrador, usuário do Salão e usuário da Copa.
