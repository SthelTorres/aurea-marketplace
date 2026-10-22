import { expect, test } from '@playwright/test'
import { catalogCards, filtersRoot, resetDb } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
})

test('busca, filtros, ordenação, paginação e histórico', async ({ page }) => {
  const filters = await filtersRoot(page)
  await filters.getByLabel('Buscar').fill('Fênix')
  await expect(page).toHaveURL(/q=F/)
  await expect(catalogCards(page).filter({ hasText: 'Fênix Imperial' })).toHaveCount(1)

  await filters.getByLabel('Rara').check()
  await filters.getByLabel('Preço mín.').fill('0.2')
  await filters.getByRole('combobox', { name: 'Ordenação' }).click()
  await page.getByRole('option', { name: 'Menor preço' }).click()
  await expect(page).toHaveURL(/category=Rare/)
  await expect(page).toHaveURL(/minPrice=0\.2/)
  await expect(page).toHaveURL(/sort=price_asc/)
  await expect(page).toHaveURL(/page=1|q=/)

  await page.goto('/?page=2')
  await expect(catalogCards(page).first()).toBeVisible()
  await page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: '1' }).click()
  await expect(page).toHaveURL(/page=1/)
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(catalogCards(page)).toHaveCount(12)
})

test('a busca só dispara depois do debounce do relógio', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-01T15:00:00Z') })
  await page.goto('/')
  await expect(catalogCards(page).first()).toBeVisible()
  const filters = await filtersRoot(page)
  await filters.getByLabel('Buscar').fill('Oráculo')
  await page.waitForTimeout(50)
  await expect(page).not.toHaveURL(/q=/)
  await page.clock.fastForward(400)
  await page.clock.resume()
  await expect(page).toHaveURL(/[?&]q=Or/)
  await expect(catalogCards(page).filter({ hasText: 'Oráculo de Cristal' })).toHaveCount(1)
})

test('respostas fora de ordem mostram só a última busca @responsive', async ({ page }) => {
  await page.evaluate(async () => {
    await fetch('/api/dev/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'out-of-order' }),
    })
  })
  const filters = await filtersRoot(page)
  await filters.getByLabel('Buscar').fill('Lótus')
  await expect(page).toHaveURL(/q=L/)
  await filters.getByLabel('Buscar').fill('Titã')
  await expect(catalogCards(page).filter({ hasText: 'Titã Esmeralda' })).toHaveCount(1)
  await expect(catalogCards(page).filter({ hasText: 'Lótus Infinito' })).toHaveCount(0)
})
