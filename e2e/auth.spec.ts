import { expect, test } from '@playwright/test'
import { credentials, login, logout, resetDb } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
})

test('cadastro, login, logout e troca de usuário', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Nova Coleção')
  await page.getByLabel('E-mail').fill(credentials.email)
  await page.getByLabel('Senha', { exact: true }).fill('Senha@123')
  await page.getByLabel('Confirmar senha').fill('Senha@123')
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()

  const email = `novo-${Date.now()}@aurea.dev`
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.getByRole('button', { name: 'Abrir menu da conta' })).toBeVisible()
  await logout(page)

  await login(page)
  await logout(page)
  await login(page, credentials.otherEmail)
  await page.goto('/perfil')
  await expect(page.getByLabel('E-mail')).toHaveValue(credentials.otherEmail)
})

test('sessão expirada redireciona ao login e preserva o destino', async ({ page }) => {
  await login(page)
  await page.evaluate(async () => {
    await fetch('/api/dev/expire-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('aurea-token') ?? ''}` },
    })
  })
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/login/)
  await expect(page).toHaveURL(/redirect=/)
  await expect(page.getByText('Sua sessão expirou')).toBeVisible()
  await page.getByLabel('E-mail').fill(credentials.email)
  await page.getByLabel('Senha').fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/perfil/)
})
