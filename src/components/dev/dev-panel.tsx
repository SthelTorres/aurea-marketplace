import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { devPanelVisible } from '@/mocks/dev-tools'
import { SCENARIO_KEY } from '@/mocks/keys'
import { apiClient, TOKEN_STORAGE_KEY } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SCENARIO_LABELS, SCENARIOS, type Scenario } from '@/shared/types'
import { addEth } from '@/shared/money'
import type { Nft } from '@/shared/types'

export function DevPanel() {
  const queryClient = useQueryClient()
  const [scenario, setScenario] = useState<Scenario>(() => (localStorage.getItem(SCENARIO_KEY) as Scenario | null) ?? 'default')
  const [message, setMessage] = useState('')
  if (!devPanelVisible()) return null

  const refresh = async () => {
    await queryClient.invalidateQueries()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" data-testid="dev-panel-trigger" className="fixed bottom-4 right-4 z-40 shadow-lg" size="sm">
          Dev
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="dev-panel-desc">
        <DialogTitle>Painel de desenvolvimento</DialogTitle>
        <DialogDescription id="dev-panel-desc">Cenários de rede, reset e eventos de tempo real.</DialogDescription>
        <div className="mt-4 space-y-4">
          <Select value={scenario} onValueChange={(value) => {
            const next = value as Scenario
            setScenario(next)
            void apiClient.post('/dev/scenario', { scenario: next }).then(() => refresh())
          }}>
            <SelectTrigger aria-label="Cenário">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map((item) => <SelectItem key={item} value={item}>{SCENARIO_LABELS[item]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="w-full" onClick={() => {
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            void apiClient.post('/dev/reset').then(() => { window.location.href = '/' })
          }}>Resetar dados</Button>
          <div className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => void bumpPrice().then((text) => { setMessage(text); return refresh() })}>Simular mudança de preço</Button>
            <Button type="button" variant="outline" onClick={() => void apiClient.post('/dev/emit-nft-update', { nftId: 'nft-01', stock: 0 }).then(() => { setMessage('Estoque enviado.'); return refresh() })}>Esgotar NFT 01</Button>
            <Button type="button" variant="outline" onClick={() => void apiClient.post('/dev/socket/replay-last').then(() => setMessage('Último evento reenviado.'))}>Reenviar último evento</Button>
            <Button type="button" variant="outline" onClick={() => void apiClient.post('/dev/socket/emit-stale', { nftId: 'nft-01' }).then(() => setMessage('Evento antigo enviado.'))}>Enviar evento antigo</Button>
            <Button type="button" variant="outline" onClick={() => void apiClient.post('/dev/socket/disconnect').then(() => setMessage('Tempo real interrompido.'))}>Desconectar tempo real</Button>
            <Button type="button" variant="outline" onClick={() => void apiClient.post('/dev/socket/restore').then(() => setMessage('Tempo real liberado.'))}>Restaurar tempo real</Button>
          </div>
          {message ? <p className="text-sm text-[#B8AA96]">{message}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function bumpPrice(): Promise<string> {
  const { data } = await apiClient.get<Nft>('/nfts/nft-01')
  const edition = data.editions[0]
  if (!edition) return 'NFT sem edição.'
  const priceEth = addEth(edition.priceEth, '0.01')
  await apiClient.post('/dev/emit-nft-update', { nftId: data.id, editionId: edition.id, priceEth })
  return `Preço de ${data.name} enviado: ${priceEth} ETH.`
}
