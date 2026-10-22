import { expect, test } from '@playwright/test'
import { addFromCatalog, login, resetDb, reviewPurchase, setScenario } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
  await login(page)
  await addFromCatalog(page, 'Guardião Solar')
})

test('pagamento recusado preserva o carrinho e permite nova tentativa', async ({ page }) => {
  await setScenario(page, 'payment-refuse')
  await reviewPurchase(page)
  await page.getByTestId('confirm-order').click()
  await expect(page.getByTestId('order-status')).toHaveText('Pagamento recusado')
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-item')).toContainText('Guardião Solar')
})

test('a mesma chave de idempotência devolve o mesmo pedido e conteúdo diferente conflita', async ({ page }) => {
  await page.goto('/pagamento')
  await expect(page.getByRole('heading', { name: 'Finalizar aquisição' })).toBeVisible()
  const result = await page.evaluate(async () => {
    const token = localStorage.getItem('aurea-token') ?? ''
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const wallets = await fetch('/api/wallets', { headers }).then((response) => response.json()) as { id: string }[]
    await fetch(`/api/wallets/${wallets[0]?.id}/connect`, { method: 'POST', headers })
    const quote = await fetch('/api/checkout/quote', {
      method: 'POST',
      headers,
      body: JSON.stringify({ network: 'ethereum' }),
    }).then((response) => response.json()) as { id: string }
    const key = 'chave-repetida-e2e'
    const send = (name: string) => fetch('/api/orders', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': key },
      body: JSON.stringify({
        quoteId: quote.id,
        network: 'ethereum',
        walletId: wallets[0]?.id,
        collector: { name, email: 'colecionador@aurea.dev' },
      }),
    })
    const first = await send('Colecionador Áurea')
    const firstBody = await first.json() as { id?: string }
    const second = await send('Colecionador Áurea')
    const secondBody = await second.json() as { id?: string }
    const conflict = await send('Outra Pessoa')
    const conflictBody = await conflict.json() as { code?: string }
    return {
      same: first.ok && second.ok && firstBody.id === secondBody.id,
      conflict: conflict.status === 409 && conflictBody.code === 'IDEMPOTENCY_CONFLICT',
    }
  })
  expect(result.same).toBe(true)
  expect(result.conflict).toBe(true)
})

test('timeout recupera o mesmo pedido pendente e depois confirma', async ({ page }) => {
  await setScenario(page, 'payment-timeout')
  await reviewPurchase(page)
  await page.getByTestId('confirm-order').click()
  await expect(page.getByTestId('confirm-order')).toBeDisabled()
  await expect(page.getByTestId('order-status')).toHaveText('Pagamento pendente', { timeout: 20_000 })
  const orderUrl = page.url()
  await page.reload()
  await expect(page).toHaveURL(orderUrl)
  await expect(page.getByTestId('order-status')).toHaveText(/Pagamento pendente|Pagamento confirmado/)
  await expect(page.getByTestId('order-status')).toHaveText('Pagamento confirmado', { timeout: 20_000 })
})
