import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

// 少量 .test.ts 仍验证浏览器 API；其余 .test.ts 可直接在 Node 中运行。
const domTestFiles = [
	'src/app/navigation/memoryStore.test.ts',
	'src/features/appearance/index.test.ts',
	'src/features/command/keybinding/keybinding.test.ts',
	'src/features/command/shortcuts/shortcut-dispatcher.test.ts',
	'src/features/display-options/api/displayOptions.test.ts',
	'src/features/selection/model/collectionFocusBridge.test.ts',
	'src/features/settings/api/shellDevicePreferences.test.ts',
	'src/features/settings/model/lastSettingsSection.test.ts',
	'src/features/update/components/SystemStatusChip.test.ts',
	'src/layout/model/shellSidebarController.test.ts',
	'src/shared/events/taskChanged.test.ts',
	'src/shared/lib/localStorageValue.test.ts',
]

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': srcDir,
		},
	},
	test: {
		globals: true,
		restoreMocks: true,
		projects: [
			{
				test: {
					name: 'unit',
					environment: 'node',
					setupFiles: ['./src/test/failOnUnexpectedConsole.ts'],
					include: ['src/**/*.test.ts'],
					exclude: domTestFiles,
				},
			},
			{
				test: {
					name: 'dom',
					environment: 'jsdom',
					setupFiles: ['./src/test/failOnUnexpectedConsole.ts', './src/test/setup.ts'],
					include: ['src/**/*.test.tsx', ...domTestFiles],
				},
			},
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
		},
	},
})
