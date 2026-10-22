# Arquitetura

A Áurea é uma SPA. Vite entrega o bundle, TanStack Router troca as rotas e TanStack Query guarda o cache. Axios fala com `/api`. MSW 2.15 responde no service worker. O `socket.io-client` usa só WebSocket. O binding `@mswjs/socket.io-binding` faz o handshake Engine.IO/Socket.IO dentro do MSW.

O `main` monta a interface logo e inicia o MSW em paralelo; o Axios aguarda o worker via `waitForMocks()` antes das chamadas REST. Valores em ETH são strings decimais. A conta usa `BigInt` com 8 casas (`src/shared/money.ts`).

## Contratos REST

Erros: `{ message, code, details?: { fields?: Record<string, string>, quote?: Quote } }`.

| Método e caminho | Função |
| --- | --- |
| `POST /api/auth/register` e `POST /api/auth/login` | Criam sessão. O header `X-Guest-Id` funde o carrinho do visitante, somando quantidades até o estoque. |
| `GET /api/auth/session` | Sessão atual. |
| `POST /api/auth/logout` | Encerra a sessão. |
| `GET /api/nfts` | `q`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `pageSize`. O catálogo cancela a busca anterior com `AbortSignal`. |
| `GET /api/nfts/:id` | Detalhe ou `404 NFT_NOT_FOUND`. |
| `GET` e `POST /api/favorites`, `DELETE /api/favorites/:nftId` | Favoritos da conta. |
| `GET /api/cart`, `POST /api/cart/items`, `PATCH` e `DELETE /api/cart/items/:id` | Carrinho. Quantidade acima do estoque devolve `409 OUT_OF_STOCK`. |
| `POST` e `DELETE /api/cart/coupon` | `AUREA10`, `COUPON_INVALID` ou `COUPON_EXPIRED`. |
| `POST /api/checkout/quote` | Corpo `{ network }`. Taxa `0.0021` na Ethereum e `0.0004` na Polygon. |
| `POST /api/orders` | Header `Idempotency-Key` e corpo `{ quoteId, network, walletId, collector: { name, email } }`. |
| `GET /api/orders/:id` | Só o dono. |
| `GET` e `PATCH /api/profile`, `POST /api/profile/password` | Perfil, avatar em data URL e senha. E-mail repetido: `409 EMAIL_TAKEN`. |
| `GET` e `POST /api/wallets`, `PATCH /api/wallets/:id`, `POST /api/wallets/:id/connect` e `disconnect` | No máximo uma carteira principal e uma secundária. Endereço `0x` + 40 hex. |

A mesma chave e o mesmo corpo devolvem o mesmo pedido. A mesma chave com outro corpo devolve `409 IDEMPOTENCY_CONFLICT`. Se o preço ou o estoque mudaram desde a cotação, a resposta é `409 QUOTE_CHANGED` com a cotação nova em `details.quote`. Estoque insuficiente na confirmação é `409 OUT_OF_STOCK`.

Pedido confirmado tira do carrinho só as edições e quantidades compradas e baixa o estoque. Recusa e falha deixam o carrinho como está. O recibo só aparece com `status === "confirmed"` e guarda itens, preços, taxas, total, rede, carteira, colecionador, `txHash` e `explorerUrl` simulados.

Endpoints de desenvolvimento (sem a latência do cenário): `POST /api/dev/reset`, `/api/dev/scenario`, `/api/dev/expire-session`, `/api/dev/emit-nft-update`, `/api/dev/emit-order-update`, `/api/dev/socket/replay-last`, `/api/dev/socket/emit-stale`, `/api/dev/socket/disconnect`, `/api/dev/socket/restore`.

## Eventos

Envelope: `{ id, type: "nft.updated" | "order.updated", resourceId, version, occurredAt, data }`.

O cliente entra com `session.join` e o token em todo `connect`, inclusive depois de reconectar, e sai com `session.leave`. `nft.updated` vai para todas as conexões. `order.updated` só para o `userId` do pedido. O cliente descarta `id` repetido (memória de 300) e versão menor ou igual à já aplicada. `confirmed` e `refused` não voltam atrás. Na reconexão, a sessão entra de novo e catálogo, obra aberta, carrinho, cotação e pedido pendente são relidos pela REST.

O Playwright enxerga um WebSocket nativo em `/socket.io/` porque o service worker não aparece como socket de rede. Esse canal só espelha os bytes que o binding já codificou. A aplicação consome o socket do MSW.

## Sessão

O token fica em `localStorage` (`aurea-token`). O visitante tem `aurea-guest-id`. Rotas privadas (`/pagamento`, `/pedidos/$orderId`, `/perfil`, `/carteiras`, `/favoritos`) chamam `GET /api/auth/session` antes de entrar. Sem sessão, a rota vai para `/login?redirect=` com um caminho relativo.

HTTP 401 fora de login, cadastro e logout apaga o token, limpa o cache privado, derruba o socket, avisa “Sua sessão expirou” e volta ao login sem perder o rascunho do checkout (`sessionStorage`). Logout e troca de conta removem as queries do usuário anterior e abrem outro socket. Senha nunca é guardada em claro: o mock grava um hash.

## Carrinho e cache

Chaves: `['session']`, `['nfts', filtros]`, `['nft', id]`, `['user', userId, 'favorites' | 'cart' | 'profile' | 'wallets']`, `['guest', guestId, 'cart']`, cotação por dono, versão do carrinho e rede, e `['user', userId, 'orders', orderId]`.

`staleTime` de 30 s. Até duas novas tentativas só para rede ou HTTP 5xx. Mutations não repetem sozinhas. O catálogo usa `placeholderData: keepPreviousData` e mostra “Atualizando…”. Favoritar e mudar quantidade são otimistas e desfazem se a API falhar. Favoritos releem ao abrir a página.

O id do pedido pendente fica no `localStorage` por usuário. O cabeçalho mostra “Você tem um pedido pendente” e a página do pedido consulta a API a cada 3 s enquanto espera o `order.updated`.

## Limitações

- O gateway, o explorador e a conexão de carteira são simulação.
- O choque de preço do cenário `price-change` acontece uma vez por banco, até o reset.
- O preço do card é o menor entre as edições com estoque. Uma edição mais cara pode mudar sem alterar o card.
- O chunk do MSW sobe junto com a aplicação para o mock existir antes das chamadas.
- O espelho WebSocket existe para o teste observar o frame. A UI não lê esse segundo socket.

## Interface

O tema segue o Figma do desafio: fundo `#0B0706`, cartões `#140C0A`, acento `#F26B1D` e texto `#F8F0D8`. O herói usa a frase “Seja dono do futuro da arte digital.” Filtros ficam na lateral a partir de 768 px e num drawer abaixo disso. O menu móvel abre num drawer à direita, alinhado ao botão hambúrguer, com foco preso.

Desvios do Figma: as obras e o herói usam WebP gerados localmente (`scripts/generate-art.py`) com paleta e composição alinhadas ao layout, no lugar de exportar raster do arquivo Figma (o pacote do desafio não inclui assets soltos; a tipografia usa Inter via Google Fonts como no frame). Links de suporte e termos aparecem como “Em breve”. O painel Dev só aparece em desenvolvimento ou com `?dev=1` na URL em produção, para reproduzir cenários MSW sem poluir a demo. A página de favoritos foi acrescentada para a conta ter onde ver as obras marcadas.
