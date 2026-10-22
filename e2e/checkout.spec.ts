import { expect, test } from '@playwright/test'
import { addFromCatalog, login, resetDb, reviewPurchase } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
  await login(page)
  await addFromCatalog(page, 'Aurora Dourada')
})

test('compra completa do catálogo ao recibo confirmado', async ({ page }) => {
  await reviewPurchase(page)
  await page.getByTestId('confirm-order').click()
  await expect(page.getByTestId('order-status')).toHaveText('Pagamento confirmado')
  await expect(page.getByRole('heading', { name: 'Recibo' })).toBeVisible()
  await expect(page.getByText('Aurora Dourada')).toBeVisible()
  await expect(page.getByText('0.0021 ETH').first()).toBeVisible()
  const explorer = page.getByRole('link', { name: 'Ver no explorador (simulado)' })
  await expect(explorer).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)
  await expect(explorer).toHaveAttribute('target', '_blank')
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-item')).toHaveCount(0)
})
