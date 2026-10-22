import { expect, test } from '@playwright/test'
import { resetDb } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
})

test('acesso direto ao detalhe mostra a obra e limita a quantidade', async ({ page }) => {
  await page.goto('/nfts/nft-02')
  await expect(page.getByRole('heading', { name: 'Guardião Solar' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Galeria da obra' })).toBeVisible()
  await page.getByRole('tab', { name: /Mostrar imagem 2/ }).click()
  await expect(page.getByRole('img', { name: 'Guardião Solar, imagem 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('group', { name: 'Quantidade' })).toContainText('2')
})

test('recurso inexistente mostra obra não encontrada', async ({ page }) => {
  await page.goto('/nfts/nft-inexistente')
  await expect(page.getByRole('heading', { name: 'Obra não encontrada' })).toBeVisible()
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: /não encontrad/i })).toBeVisible()
})

test('edição esgotada fica indisponível', async ({ page }) => {
  await page.goto('/nfts/nft-24')
  await expect(page.getByText('Esgotada').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeDisabled()
})
