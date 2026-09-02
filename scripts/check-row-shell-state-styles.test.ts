import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repositoryRoot = resolve(import.meta.dir, '..')
const themeCss = readFileSync(resolve(repositoryRoot, 'src/styles/theme.css'), 'utf8')
const componentCss = readFileSync(resolve(repositoryRoot, 'src/styles/components.css'), 'utf8')
const uiLabCss = readFileSync(resolve(repositoryRoot, 'src/ui-lab/uiLab.css'), 'utf8')

test('RowShell 状态表面由共享语义 token 持有', () => {
	expect(themeCss).toContain('--surface-hover: #efeff0;')
	expect(themeCss).toContain('--surface-active: #e7e7e8;')
	expect(themeCss).toContain('--selection: #e8e8f4;')
	expect(themeCss).toContain('--selection-hover: #dedeea;')
	expect(componentCss).toMatch(
		/\[data-row-shell\]\[data-active="true"\]:not\(\[data-selected="true"\]\)\s*\{\s*background:\s*var\(--surface-active\);\s*\}/,
	)
	expect(componentCss).toMatch(
		/\[data-row-shell\]\[data-interactive="true"\]\[data-active="true"\]:not\(\s*\[data-selected="true"\]\s*\):hover\s*\{\s*background:\s*var\(--surface-active\);\s*\}/,
	)
	expect(componentCss).toMatch(
		/\[data-row-shell\]\[data-selected="true"\]\s*\{\s*background:\s*var\(--selection\);\s*\}/,
	)
	expect(componentCss).toMatch(
		/\[data-row-shell\]\[data-selected="true"\]\[data-hovered="true"\]\s*\{\s*background:\s*var\(--selection-hover\);\s*\}/,
	)
	expect(componentCss).toMatch(
		/\[data-row-shell\]\[data-interactive="true"\]\[data-selected="true"\]:hover\s*\{\s*background:\s*var\(--selection-hover\);\s*\}/,
	)
	expect(uiLabCss).not.toContain('[data-ui-lab-task-rows]')
})
