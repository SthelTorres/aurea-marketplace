import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { socketRelayPlugin } from './vite.socket-relay.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), socketRelayPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replaceAll('\\', '/')
          if (!normalized.includes('/node_modules/')) return
          const pkg = normalized.split('/node_modules/').pop() ?? normalized
          if (/^(msw|@mswjs|@open-draft|rettime|outvariant|strict-event-emitter|headers-polyfill)\//.test(pkg)) return 'msw'
          if (/^(socket\.io-client|engine\.io-client)\//.test(pkg)) return 'socket'
          if (/^@tanstack\/(react-router|router-core|history)\//.test(pkg)) return 'router'
          if (/^@tanstack\/(react-query|query-core)\//.test(pkg)) return 'query'
          if (/^(react-hook-form|@hookform|zod)\//.test(pkg)) return 'forms'
          if (pkg.startsWith('axios/')) return 'http'
          if (/^(@radix-ui|lucide-react)\//.test(pkg)) return 'ui'
          if (/^(react-dom|react|scheduler)\//.test(pkg)) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
