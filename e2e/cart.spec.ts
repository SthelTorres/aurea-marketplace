import { expect, test } from '@playwright/test'
import { addFromCatalog, login, resetDb } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetDb(page)
})

test('quantidades, remoção, cupom e persistência após refresh e login', async ({ page }) => {
  await page.goto('/nfts/nft-02')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByTestId('header-cart')).toHaveAttribute('aria-label', /2 itens/)
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-item')).toContainText('Guardião Solar')
  await expect(page.getByTestId('header-cart')).toHaveAttribute('aria-label', /2 itens/)
  await page.reload()
  await expect(page.getByTestId('cart-item')).toContainText('Guardião Solar')
  await expect(page.getByTestId('header-cart')).toHaveAttribute('aria-label', /2 itens/)

  await page.getByLabel('Cupom').fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom inválido.')).toBeVisible()
  await page.getByLabel('Cupom').fill('EXPIRADO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este cupom está expirado.')).toBeVisible()
  await page.getByLabel('Cupom').fill('AUREA10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByTestId('cart-summary')).toContainText(/-0\.0*[1-9]/)

  await page.getByRole('button', { name: /Remover Guardião Solar/ }).click()
  await expect(page.getByText(/vazio|nenhum item/i)).toBeVisible()

  await addFromCatalog(page, 'Aurora Dourada')
  await login(page)
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-item')).toContainText('Aurora Dourada')
})
