import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('UI Lab native baseline boundary', () => {
	test('Upstream、Token 与 Current 使用固定且互斥的样式链', () => {
		const upstream = read('src/ui-lab/native-comparison/upstream.css')
		const token = read('src/ui-lab/native-comparison/token.css')
		const baseline = read('src/ui-lab/native-comparison/baselineMain.tsx')
		const current = read('src/ui-lab/main.tsx')

		expect(upstream).toContain('@import "tailwindcss"')
		expect(upstream).toContain('@import "@heroui/styles"')
		expect(upstream).toContain('@import "@heroui-pro/react/css"')
		expect(upstream).not.toContain('../../styles/')
		expect(token).toContain('@import "./upstream.css"')
		expect(token).toContain('@import "../../styles/fonts.css"')
		expect(token).toContain('@import "../../styles/theme.css"')
		for (const forbidden of ['components.css', 'base.css', 'uiLab.css', 'index.css']) {
			expect(token).not.toContain(forbidden)
			expect(baseline).not.toContain(forbidden)
		}
		expect(baseline).not.toContain('bootstrapAppearance')
		expect(baseline).toContain("role='alert'")
		expect(current).toContain("import '../styles/index.css'")
	})

	test('baseline 只在开发期 HTML 中装配，不进入正式 build input', () => {
		const html = read('ui-lab-baseline.html')
		const host = read('src/ui-lab/native-comparison/NativeComparison.tsx')
		const vite = read('vite.config.ts')
		expect(html).toContain('/src/ui-lab/native-comparison/baselineMain.tsx')
		expect(html).not.toContain('rel="stylesheet"')
		for (const forbidden of ['createPortal', 'contentDocument', 'contentWindow']) {
			expect(host).not.toContain(forbidden)
		}
		expect(vite).not.toContain('ui-lab-baseline.html')
		expect(vite).not.toContain('ui-lab.html')
	})
})
