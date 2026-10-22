import { expect, test } from '@playwright/test'
import { catalogCards, resetDb, setScenario } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
})

test('teclado, foco do diálogo e validação de formulário', async ({ page }) => {
  await page.goto('/?dev=1')
  await expect(page.locator('html')).toHaveAttribute('data-mocks', 'ready', { timeout: 20_000 })
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()

  await page.getByTestId('dev-panel-trigger').focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('dev-panel-trigger')).toBeFocused()

  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await expect(page.locator('#email-error')).toHaveAttribute('id', 'email-error')
})

test('menu móvel prende o foco e fecha com Esc', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'O menu hambúrguer só aparece abaixo de 768px.')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Menu' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
})

test('skeleton lento, falha de catálogo e nova tentativa', async ({ page }) => {
  await setScenario(page, 'slow')
  await page.goto('/?q=Aurora')
  await expect(page.getByTestId('catalog-skeletons')).toBeVisible()
  await expect(catalogCards(page).first()).toBeVisible()

  await setScenario(page, 'fail-catalog')
  await page.goto('/?q=Nebulosa')
  await expect(page.locator('#catalogo').getByRole('alert')).toBeVisible()
  await setScenario(page, 'default')
  await page.locator('#catalogo').getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(catalogCards(page).first()).toContainText('Nebulosa Áurea')
})

test('layout sem overflow nos três viewports @responsive', async ({ page }) => {
  await page.goto('/')
  await expect(catalogCards(page).first()).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
