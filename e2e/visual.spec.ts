import { expect, test } from '@playwright/test'
import { addFromCatalog, login, resetDb } from './helpers'

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'As baselines visuais versionadas são do desktop 1440.')
  await resetDb(page)
})

test('regressão visual da início, detalhe, carrinho e pagamento', async ({ page }) => {
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })

  await page.goto('/nfts/nft-01')
  await expect(page.getByRole('heading', { name: 'Aurora Dourada' })).toBeVisible()
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true })

  await login(page)
  await addFromCatalog(page, 'Aurora Dourada')
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-summary')).toContainText('ETH')
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true })

  await page.goto('/pagamento')
  await expect(page.getByRole('heading', { name: 'Finalizar aquisição' })).toBeVisible()
  await expect(page.getByTestId('cart-summary')).toContainText('ETH')
  await expect(page).toHaveScreenshot('payment.png', { fullPage: true })
})
