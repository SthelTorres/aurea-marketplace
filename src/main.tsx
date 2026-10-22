import { setMocksReady } from '@/mocks/ready'

setMocksReady(import('@/mocks/enable').then((mod) => mod.enableMocking()))

const { mount } = await import('./bootstrap')
mount()
