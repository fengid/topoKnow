import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 移动端独立工程：开发服务器 6012，/api 代理到后端 6011
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 6012,
    proxy: {
      '/api': {
        target: 'http://localhost:6011',
        changeOrigin: true,
        // 剥离 Origin：同源代理请求无需 CORS 校验；后端 CORS 白名单
        // 不含开发端口，不剥离会被其 CORS 中间件 403
        headers: { Origin: '' },
      },
    },
  },
})
