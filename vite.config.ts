import { fileURLToPath } from 'node:url'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST
const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const analyzeBundle = process.env.ANALYZE === '1'

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: true,
			routeFileIgnorePrefix: '-',
		}),
		react(),
		tailwindcss(),
		analyzeBundle
			? visualizer({
					filename: 'dist/bundle-stats.json',
					template: 'raw-data',
					gzipSize: true,
				})
			: null,
	],
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
		// 壳层共享图会把重型 node_modules 捆进同一 chunk；按官方建议拆 vendor，避免单文件 >500kB。
		rolldownOptions: {
			input: {
				main: fileURLToPath(new URL('./index.html', import.meta.url)),
				launcher: fileURLToPath(new URL('./launcher.html', import.meta.url)),
			},
			output: {
				codeSplitting: {
					groups: [
						{
							name: 'vendor-react',
							test: /node_modules[\\/](react|react-dom|scheduler)([\\/]|$)/,
							priority: 40,
						},
						{
							name: 'vendor-radix',
							test: /node_modules[\\/](@radix-ui|radix-ui)([\\/]|$)/,
							priority: 30,
						},
						{
							name: 'vendor-date',
							test: /node_modules[\\/](react-day-picker|date-fns)([\\/]|$)/,
							priority: 25,
						},
						{
							name: 'vendor-form',
							test: /node_modules[\\/](react-hook-form|zod|@hookform)([\\/]|$)/,
							priority: 25,
						},
						{
							name: 'vendor',
							test: /node_modules/,
							priority: 10,
						},
					],
				},
			},
		},
	},
})
