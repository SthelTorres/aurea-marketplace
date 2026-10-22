import { expect, test } from '@playwright/test'
import { login, resetDb } from './helpers'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await resetDb(page)
  await login(page)
})

test('perfil, avatar, senha e carteiras validam erros', async ({ page }) => {
  await page.goto('/perfil')
  await page.locator('#avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('img', { name: /Avatar de/ })).toBeVisible()
  await page.getByLabel('Nome').fill('Colecionador Renomeado')
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome')).toHaveValue('Colecionador Renomeado')

  await page.getByLabel('E-mail').fill('colecionadora@aurea.dev')
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText(/já está em uso/i)).toBeVisible()

  await page.getByLabel('Senha atual').fill('errada')
  await page.getByLabel('Nova senha', { exact: true }).fill('Senha@999')
  await page.getByLabel('Confirmar nova senha').fill('Senha@999')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('A senha atual está incorreta.')).toBeVisible()

  await page.goto('/carteiras')
  await page.locator('#secondary-address').fill('0x123')
  await page.getByRole('button', { name: 'Salvar alterações' }).nth(1).click()
  await expect(page.getByText(/40 caracteres hexadecimais/)).toBeVisible()
})
