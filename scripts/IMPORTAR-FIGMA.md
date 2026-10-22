# Substituir imagens pelos exports do Figma (opcional)

O enunciado aponta o [arquivo Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). O repositório do desafio não traz PNG/WebP soltos; a entrega usa WebP gerados em `generate-art.py` com a mesma paleta.

Para trocar pelos frames do Figma:

1. Abra o arquivo e selecione a imagem do **hero** e cada **card de NFT** nos frames desktop/mobile.
2. Exporte em **WebP** (ou PNG 2×) com nomes:
   - `public/images/hero.webp` e `public/images/hero-640.webp` (redimensione o hero para 640 px de largura)
   - `public/images/nfts/art-01.webp` … `art-12.webp` (600×600)
3. Rode `npm run build` e, se necessário, `npx playwright test e2e/visual.spec.ts --project=desktop-chromium --update-snapshots`.

Não commite secrets. Mantenha arquivos abaixo de ~120 KB por imagem para preservar o Lighthouse mobile.
