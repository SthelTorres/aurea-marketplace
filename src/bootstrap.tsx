import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { getGuestId } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import Root from './Root'
import './index.css'

export function mount(): void {
  getGuestId()
  const root = document.getElementById('root')
  if (!root) return
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Root />
        <Toaster theme="dark" richColors position="top-right" />
      </QueryClientProvider>
    </StrictMode>,
  )
}
