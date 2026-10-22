import { expect, test } from '@playwright/test'
import { catalogCards, login, resetDb, setScenario } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
  await login(page)
})

test('favoritar persiste e a falha desfaz a alteração', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Abrir menu da conta' })).toBeVisible()
  const card = catalogCards(page).filter({ hasText: 'Aurora Dourada' })
  const [saved] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/favorites') && response.request().method() === 'POST'),
    card.getByRole('button', { name: 'Adicionar aos favoritos' }).click(),
  ])
  expect(saved.ok()).toBe(true)
  await expect(card.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
  await page.goto('/favoritos')
  await expect(page.getByRole('heading', { name: 'Aurora Dourada' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Aurora Dourada' })).toBeVisible()

  await setScenario(page, 'favorite-fail')
  await page.getByRole('button', { name: 'Remover dos favoritos' }).click()
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aurora Dourada' })).toBeVisible()
})
