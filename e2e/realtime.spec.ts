import { expect, test } from '@playwright/test'
import { addFromCatalog, catalogCards, login, resetDb, reviewPurchase, setScenario } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
  await login(page)
})

test('mudança de preço via Socket.IO pede nova cotação no checkout', async ({ page }) => {
  const frames: string[] = []
  page.on('websocket', (socket) => {
    socket.on('framereceived', (frame) => {
      if (typeof frame.payload === 'string') frames.push(frame.payload)
    })
  })
  await addFromCatalog(page, 'Aurora Dourada')
  await setScenario(page, 'price-change')
  await reviewPurchase(page)
  await page.getByTestId('confirm-order').click()
  await expect(page.getByRole('dialog', { name: 'A cotação mudou' })).toBeVisible()
  await expect(page.getByText(/0\.08 ETH → 0\.09 ETH|→ 0\.09/)).toBeVisible()
  expect(frames.some((frame) => frame.includes('nft.updated'))).toBe(true)
  await page.getByRole('button', { name: 'Aceitar nova cotação' }).click()
  await page.getByTestId('confirm-order').click()
  await expect(page.getByTestId('order-status')).toHaveText('Pagamento confirmado')
})

test('evento duplicado ou antigo não regride o preço e a desconexão reconecta', async ({ page }) => {
  const frames: string[] = []
  page.on('websocket', (socket) => {
    socket.on('framereceived', (frame) => {
      if (typeof frame.payload === 'string') frames.push(frame.payload)
    })
  })
  await page.goto('/')
  const card = page.locator('#catalogo [data-testid="nft-card"][data-nft-id="nft-01"]')
  await expect(card).toContainText('0.08 ETH')
  await page.evaluate(async () => {
    await fetch('/api/dev/emit-nft-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-01', editionId: 'nft-01-edition-1', priceEth: '0.01' }),
    })
  })
  await expect(card).toContainText('0.01 ETH')
  const afterFirst = frames.filter((frame) => frame.includes('nft.updated')).length
  await page.evaluate(async () => {
    await fetch('/api/dev/socket/replay-last', { method: 'POST' })
    await fetch('/api/dev/socket/emit-stale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-01' }),
    })
  })
  await expect.poll(() => frames.filter((frame) => frame.includes('nft.updated')).length).toBeGreaterThan(afterFirst)
  await expect(card).toContainText('0.01 ETH')

  await page.evaluate(async () => {
    await fetch('/api/dev/socket/disconnect', { method: 'POST' })
  })
  await expect(page.getByTestId('socket-status')).toContainText('reconectando')
  await page.evaluate(async () => {
    await fetch('/api/dev/socket/restore', { method: 'POST' })
  })
  await expect(page.getByTestId('socket-status')).toContainText('Tempo real conectado')
})

test('pedido pendente reaparece depois do refresh', async ({ page }) => {
  await addFromCatalog(page, 'Oráculo de Cristal')
  await setScenario(page, 'payment-timeout')
  await reviewPurchase(page)
  await page.getByTestId('confirm-order').click()
  await expect(page.getByTestId('order-status')).toHaveText('Pagamento pendente', { timeout: 20_000 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Você tem um pedido pendente' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Você tem um pedido pendente' })).toBeVisible()
})
