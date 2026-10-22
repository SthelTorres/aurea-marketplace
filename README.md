# Áurea Marketplace

SPA de marketplace de NFTs em React e TypeScript. Catálogo, autenticação, carrinho, checkout e atualizações em tempo real funcionam no cliente com **MSW** (REST) e **Socket.IO** simulados — não há backend de produção.

**Demonstração:** https://aurea-marketplace.vercel.app  
**Painel de cenários (produção):** https://aurea-marketplace.vercel.app/?dev=1

Documentação técnica (contratos, cache, sessão, socket): [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Tailwind CSS · shadcn/ui · MSW · socket.io-client · Playwright · Lighthouse

## Pré-requisitos

- Node.js 20+
- npm 10+

## Instalação e execução

```bash
npm ci
npm run dev
```

Abre em `http://127.0.0.1:5173`. Em desenvolvimento, o MSW inicia antes da primeira renderização.

Build e preview (mesmo comportamento do ambiente publicado):

```bash
npm run build
npm run preview
```

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_ENABLE_MSW` | `true` ativa mocks no build de produção/preview (`.env.production` e `vercel.json`). |

## Contas de demonstração

| E-mail | Senha |
| --- | --- |
| `colecionador@aurea.dev` | `Senha@123` |
| `colecionadora@aurea.dev` | `Senha@123` |

Carteiras já cadastradas usam endereços `0x` + 40 hex (ex.: principal `0xaaa…`). Cupom válido: **`AUREA10`** (10%). **`EXPIRADO`** simula cupom expirado.

## Cenários simulados (MSW)

Disponíveis pelo painel **Dev** (desenvolvimento ou `/?dev=1` em produção), por `?scenario=` na URL, `localStorage` (`aurea-scenario`) ou `POST /api/dev/scenario`.

| Cenário | Efeito resumido |
| --- | --- |
| `default` | Latência ~150 ms |
| `slow` | Latência ~1,5 s |
| `variable-latency` | 100–1200 ms (semente 42) |
| `out-of-order` | Respostas antigas do catálogo chegam depois |
| `offline` / `server-error` / `fail-catalog` | Falhas de rede ou HTTP |
| `session-expired` / `forbidden` | 401 / 403 |
| `favorite-fail` | Falha ao favoritar (rollback na UI) |
| `price-change` / `sold-out` | Conflito na confirmação do pedido |
| `payment-refuse` / `payment-timeout` | Pagamento recusado ou recuperação por idempotência |
| `wallet-refuse` | Conexão de carteira recusada |

Reset completo dos dados simulados: botão **Resetar dados** no painel Dev ou `POST /api/dev/reset`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm run preview` | Preview do `dist` |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | Oxlint |
| `npm run test:e2e` | Playwright (1440 / 768 / 390 px) |
| `npm run test:e2e:ui` | Playwright com UI |
| `npm run lighthouse` | 3 medições (home + detalhe, mobile e desktop); relatórios em `reports/lighthouse` |

Relatórios E2E: `reports/playwright` (HTML, traces e vídeo em falhas).

## Lighthouse (mediana de 3 execuções)

Ambiente: 22/10/2026 · Chrome 155 · Lighthouse 13.5 · preview local com `VITE_ENABLE_MSW=true`.

| Página | Perfil | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | mobile | 99 | 100 | 100 | 100 | 1,71 s | 0,011 | 104 ms |
| `/` | desktop | 100 | 100 | 100 | 100 | 0,64 s | 0,006 | 0 ms |
| `/nfts/nft-01` | mobile | 98 | 100 | 100 | 100 | 2,30 s | 0,011 | 79 ms |
| `/nfts/nft-01` | desktop | 100 | 100 | 100 | 100 | 0,67 s | 0,014 | 0 ms |

Metas do desafio: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95, SEO ≥ 90.

## Fluxos úteis para avaliação

1. **Compra feliz:** explorar catálogo → detalhe → carrinho → pagamento → recibo confirmado.  
2. **Falhas no checkout:** painel Dev → `price-change`, `sold-out`, `payment-refuse` ou `payment-timeout` → repetir confirmação.  
3. **Tempo real:** Dev → emitir `nft.updated` ou desconectar/restaurar socket; status no cabeçalho.  
4. **Sessão:** login → navegação privada; `POST /api/dev/expire-session` com token → redirect para login preservando contexto.

Detalhes de endpoints de desenvolvimento e eventos Socket.IO estão em `ARCHITECTURE.md`.

## Qualidade

Última execução local documentada: **46** testes E2E aprovados, **2** ignorados (escopo por viewport). Checkout limpo: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`.
