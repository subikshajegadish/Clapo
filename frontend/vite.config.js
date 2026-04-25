import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, '')
  const proxyTarget =
    env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001'

  return {
    plugins: [react()],
    // Mammoth is CJS + browser field overrides; pre-bundle deps for reliable dev/build.
    optimizeDeps: {
      include: ['mammoth', 'jszip', '@xmldom/xmldom', 'bluebird'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    define: {
      global: 'globalThis',
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
