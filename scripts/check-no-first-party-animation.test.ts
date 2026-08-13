import { describe, expect, test } from 'bun:test'

import { scanFirstPartyAnimationSources } from './check-no-first-party-animation'

describe('first-party animation scanner', () => {
	test('允许供应商 Motion 依赖、直接几何、非动画 rAF 与领域字段', () => {
		const violations = scanFirstPartyAnimationSources([
			{
				path: 'package.json',
				source: JSON.stringify({ dependencies: { motion: '13.1.0' } }),
			},
			{
				path: 'src/styles/components.css',
				source: `
@layer components {
	[data-resizing="true"] .sidebar {
		transition: none;
		transform: translateX(0);
	}
}
`,
			},
			{
				path: 'src/layout/focus.ts',
				source: `
const transition_status = 'ready'
requestAnimationFrame(() => element.focus())
const style = { transform: 'translateY(12px)' }
`,
			},
		])

		expect(violations).toEqual([])
	})

	test('拒绝直接依赖、运行时 import 与第一方动效语法', () => {
		const violations = scanFirstPartyAnimationSources([
			{
				path: 'package.json',
				source: JSON.stringify({ devDependencies: { 'tw-animate-css': '1.4.0' } }, null, 2),
			},
			{
				path: 'src/example.tsx',
				source: `
import { motion } from 'motion/react'
const classes = 'animate-spin transition-opacity duration-200 delay-75 ease-out motion-reduce:transition-none active:scale-95 scroll-smooth'
node.animate([{ opacity: 0 }, { opacity: 1 }])
document.startViewTransition(() => render())
node.scrollIntoView({ behavior: 'smooth' })
`,
			},
			{
				path: 'src/styles/legacy.css',
				source: `
@keyframes spin { to { transform: rotate(1turn); } }
.legacy {
	animation: spin 1s linear;
	transition: opacity 200ms ease;
	scroll-behavior: smooth;
}
`,
			},
		])
		const ruleIds = new Set(violations.map(({ ruleId }) => ruleId))

		expect(ruleIds).toEqual(
			new Set([
				'direct-animation-dependency',
				'animation-runtime-import',
				'css-animation',
				'css-transition',
				'tailwind-animation',
				'tailwind-transition',
				'tailwind-timing',
				'tailwind-motion',
				'tailwind-active-scale',
				'smooth-scroll',
				'web-animations-api',
				'view-transition-api',
			]),
		)
	})
})
