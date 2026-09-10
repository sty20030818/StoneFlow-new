import { describe, expect, test } from 'bun:test'

import { scanFirstPartyAnimationSources } from './check-no-first-party-animation'

const DETAIL_HOST_PATH = 'src/features/entity-detail/components/EntityDetailDrawerHost.tsx'
const DETAIL_ANIMATION = `panel.animate(
	[{ maxWidth: \`\${fromWidth}px\` }, { maxWidth: \`\${toWidth}px\` }],
	{ duration: 200, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'both' },
)`

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

	test('仅允许桌面 Aside 宿主的唯一精确实际宽度动画', () => {
		expect(
			scanFirstPartyAnimationSources([{ path: DETAIL_HOST_PATH, source: DETAIL_ANIMATION }]),
		).toEqual([])
	})

	test.each([
		['其他文件', 'src/layout/other.tsx', DETAIL_ANIMATION],
		['其他节点', DETAIL_HOST_PATH, DETAIL_ANIMATION.replace('panel.animate', 'content.animate')],
		['其他属性', DETAIL_HOST_PATH, DETAIL_ANIMATION.replaceAll('maxWidth', 'width')],
		['固定上限', DETAIL_HOST_PATH, DETAIL_ANIMATION.replace('${toWidth}', '440')],
		['其他时长', DETAIL_HOST_PATH, DETAIL_ANIMATION.replace('duration: 200', 'duration: 300')],
		[
			'其他曲线',
			DETAIL_HOST_PATH,
			DETAIL_ANIMATION.replace('0.32, 0.72, 0, 1', '0.23, 1, 0.32, 1'),
		],
		['其他填充', DETAIL_HOST_PATH, DETAIL_ANIMATION.replace("fill: 'both'", "fill: 'forwards'")],
		[
			'额外选项',
			DETAIL_HOST_PATH,
			DETAIL_ANIMATION.replace("fill: 'both'", "fill: 'both', delay: 10"),
		],
	])('Aside WAAPI 例外不放行%s', (_description, path, source) => {
		expect(scanFirstPartyAnimationSources([{ path, source }])).toEqual([
			expect.objectContaining({ path, ruleId: 'web-animations-api' }),
		])
	})

	test('Aside 精确动画不能在宿主中复制为两处调用', () => {
		expect(
			scanFirstPartyAnimationSources([
				{ path: DETAIL_HOST_PATH, source: `${DETAIL_ANIMATION}\n${DETAIL_ANIMATION}` },
			]),
		).toEqual([
			expect.objectContaining({ ruleId: 'web-animations-api' }),
			expect.objectContaining({ ruleId: 'web-animations-api' }),
		])
	})

	test.each([
		'panel.getAnimations()',
		'panel.animate([{ opacity: 0 }, { opacity: 1 }])',
		'new Animation(effect)',
		'new KeyframeEffect(panel, frames)',
	])('Aside 精确动画不放行同文件的其他 WAAPI：%s', (extraCall) => {
		expect(
			scanFirstPartyAnimationSources([
				{ path: DETAIL_HOST_PATH, source: `${DETAIL_ANIMATION}\n${extraCall}` },
			]),
		).toEqual([expect.objectContaining({ ruleId: 'web-animations-api', excerpt: extraCall })])
	})

	test.each([
		'none',
		'max-width 200ms cubic-bezier(0.23, 1, 0.32, 1)',
		'max-width 200ms cubic-bezier(0.32, 0.72, 0, 1)',
		'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1)',
	])('旧 Aside CSS 过渡例外已移除：%s', (value) => {
		const path = 'src/styles/components.css'
		expect(
			scanFirstPartyAnimationSources([
				{
					path,
					source: `[data-entity-detail-layout="true"] #task-detail { transition: ${value}; }`,
				},
			]),
		).toEqual([expect.objectContaining({ path, ruleId: 'css-transition' })])
	})

	test('Aside WAAPI 例外不放行内联 JS 过渡样式', () => {
		const path = DETAIL_HOST_PATH
		expect(
			scanFirstPartyAnimationSources([
				{
					path,
					source: `const style = { transition: 'max-width 200ms cubic-bezier(0.23, 1, 0.32, 1)' }`,
				},
			]),
		).toEqual([expect.objectContaining({ path, ruleId: 'css-transition' })])
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
