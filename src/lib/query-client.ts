import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

/**
 * Política de cache e sincronização:
 * - staleTime de 30s: consultas permanecem frescas e evitam refetch a cada foco.
 * - retry: no máximo 2 tentativas, apenas para falha de rede ou HTTP 5xx.
 *   Respostas 4xx não são repetidas.
 * - mutations nunca repetem sozinhas, para não duplicar carrinho, pedido ou favorito.
 * - o catálogo usa placeholderData: keepPreviousData e o AbortSignal do Axios,
 *   então uma resposta antiga não substitui o filtro mais recente.
 * - eventos de socket atualizam o cache só se a versão for maior que a conhecida
 *   e o id do evento ainda não tiver sido aplicado.
 */
function retryTransient(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false
  if (!axios.isAxiosError(error)) return true
  const status = error.response?.status
  if (status !== undefined && status >= 400 && status < 500) return false
  return true
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: retryTransient,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})

export function removeOtherUserQueries(userId: string): void {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[1] !== userId,
  })
}

export function removeAllUserQueries(): void {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] === 'user',
  })
}
