import { expect, type Locator, type Page } from '@playwright/test'

export const credentials = {
  email: 'colecionador@aurea.dev',
  password: 'Senha@123',
  otherEmail: 'colecionadora@aurea.dev',
}

export function catalogCards(page: Page): Locator {
  return page.locator('#catalogo [data-testid="nft-card"]')
}

export async function filtersRoot(page: Page): Promise<Locator> {
  const sidebar = page.locator('aside')
  if (await sidebar.isVisible()) return sidebar
  await page.getByRole('button', { name: 'Filtros' }).click()
  return page.getByRole('dialog', { name: 'Filtros' })
}

async function waitForMocks(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-mocks', 'ready', { timeout: 20_000 })
}

export async function resetDb(page: Page) {
  await page.goto('/')
  await waitForMocks(page)
  await expect(page.getByRole('heading', { name: /futuro da arte digital/i })).toBeVisible()
  await page.evaluate(async () => {
    await fetch('/api/dev/reset', { method: 'POST' })
    await fetch('/api/dev/socket/restore', { method: 'POST' })
    localStorage.removeItem('aurea-token')
    localStorage.removeItem('aurea-guest-id')
    localStorage.removeItem('aurea-scenario')
    sessionStorage.clear()
  })
  await page.reload()
  await waitForMocks(page)
  await expect(page.getByRole('heading', { name: /futuro da arte digital/i })).toBeVisible()
  await expect(page.getByTestId('socket-status')).toContainText('Tempo real conectado', { timeout: 15_000 })
}

export async function setScenario(page: Page, scenario: string) {
  await page.evaluate(async (value) => {
    const response = await fetch('/api/dev/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: value }),
    })
    if (!response.ok) throw new Error(`Falha ao ativar cenário: ${response.status}`)
  }, scenario)
}

export async function login(page: Page, email = credentials.email, password = credentials.password) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Abrir menu da conta' })).toBeVisible()
}

export async function logout(page: Page) {
  const account = page.getByRole('button', { name: 'Abrir menu da conta' })
  if (await account.isVisible()) {
    await account.click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
  } else {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page.getByRole('button', { name: 'Sair' }).click()
  }
  await expect(page.locator('header').getByRole('link', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir menu da conta' })).toHaveCount(0)
}

export async function addFromCatalog(page: Page, name: string) {
  await page.goto('/')
  const card = catalogCards(page).filter({ hasText: name })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: `Adicionar ${name} ao carrinho` }).click()
  await expect(page.getByTestId('header-cart')).not.toHaveAttribute('aria-label', / 0 itens/)
}

export async function reviewPurchase(page: Page) {
  await page.goto('/pagamento')
  await expect(page.getByRole('heading', { name: 'Finalizar aquisição' })).toBeVisible()
  await page.getByRole('radio', { name: /Carteira principal/ }).check()
  const connect = page.getByRole('button', { name: 'Conectar' }).first()
  if (await connect.isEnabled()) await connect.click()
  await expect(page.getByText('Conectada', { exact: true }).first()).toBeVisible()
  await page.getByRole('checkbox', { name: /termos de aquisição/i }).check()
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Revise antes de confirmar' })).toBeVisible()
}
