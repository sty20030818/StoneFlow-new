import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
	plugins: [react(), tailwindcss()],
	// 防止 Vite 清屏，便于直接看到 Rust 侧错误输出。
	clearScreen: false,
	resolve: {
		alias: {
			'@': srcDir,
		},
	},
	server: {
		// 这里固定跟随前端开发服务器端口。
		port: 5173,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: ['**/src-tauri/**'],
		},
	},
	envPrefix: ['VITE_', 'TAURI_ENV_*'],
	build: {
		target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
	},
})
