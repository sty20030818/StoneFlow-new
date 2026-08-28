import { describe, expect, test } from 'bun:test'

import { scanFeatureBoundarySources, scanUiRepositoryContract } from './check-feature-boundaries'

const TERMINAL_STYLE_PATHS = [
	'src/styles/base.css',
	'src/styles/components.css',
	'src/styles/fonts.css',
	'src/styles/index.css',
	'src/styles/theme.css',
]

describe('feature and HeroUI boundary scanner', () => {
	test('保留既有 feature public-surface 边界', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/layout/example.ts',
				source: `
import { publicTask } from '@/features/task'
import type { TaskContract } from '@/features/task/contract'
import { privateTask } from '@/features/task/model/private-task'
`,
			},
			{
				path: 'src/features/task/components/inside.ts',
				source: `import { privateTask } from '@/features/task/model/private-task'`,
			},
		])

		expect(violations).toHaveLength(1)
		expect(violations[0]).toMatchObject({
			path: 'src/layout/example.ts',
			ruleId: 'feature-deep-import',
			feature: 'task',
		})
	})

	test('拒绝生产代码静态或动态反向依赖 UI Lab', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/layout/StaticConsumer.tsx',
				source: `import { UiLabApp } from '@/ui-lab/UiLabApp'`,
			},
			{
				path: 'src/layout/AliasTraversalConsumer.tsx',
				source: `import { UiLabApp } from '@/shared/../ui-lab/UiLabApp'`,
			},
			{
				path: 'src/routes/DynamicConsumer.tsx',
				source: `void import('../ui-lab/uiLabCatalog')`,
			},
			{
				path: 'src/ui-lab/main.tsx',
				source: `
import { bootstrapAppearance } from '@/features/appearance'
import '../styles/index.css'
import { UiLabApp } from './UiLabApp'
void bootstrapAppearance
void UiLabApp
`,
			},
		])

		expect(violations.map(({ path, ruleId }) => ({ path, ruleId }))).toEqual([
			{ path: 'src/layout/StaticConsumer.tsx', ruleId: 'production-ui-lab-import' },
			{ path: 'src/layout/AliasTraversalConsumer.tsx', ruleId: 'production-ui-lab-import' },
			{ path: 'src/routes/DynamicConsumer.tsx', ruleId: 'production-ui-lab-import' },
		])
	})

	test('UI Lab 只消费内部模块和既有公开 Interface', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/ui-lab/Allowed.tsx',
				source: `
import { Button } from '@heroui/react'
import { publicTask } from '@/features/task'
import type { TaskContract } from '@/features/task/contract'
import { PageFrame } from '@/shared/components/page-frame'
import { localEntry } from './uiLabCatalog'
void Button
void publicTask
void PageFrame
void localEntry
`,
			},
			{
				path: 'src/ui-lab/Rejected.tsx',
				source: `
import { App } from '@/app/App'
import { TraversalApp } from '@/ui-lab/../app/App'
import { ShellChrome } from '../layout/ShellChrome'
void import('@/features/task/components/TaskBoard')
void App
void TraversalApp
void ShellChrome
`,
			},
		])

		expect(violations.filter(({ ruleId }) => ruleId === 'feature-deep-import')).toHaveLength(1)
		expect(violations.filter(({ ruleId }) => ruleId === 'ui-lab-private-import')).toHaveLength(3)
	})

	test('识别 named import、dot part 与静态视觉越权', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/features/example/Example.tsx',
				source: `
import { useState } from 'react'
import { AlertDialog, Button as HeroButton, Card, Dropdown, Modal, Popover } from '@heroui/react'
import { ListView, Sheet } from '@heroui-pro/react'
import { Resizable } from '@heroui-pro/react/resizable'

export function Example() {
	useState(false)
	return (
		<>
			<HeroButton className={cn('rounded-lg', open && 'hover:bg-danger', 'h-11 justify-start')} />
			<Dropdown.Item classNames={{ base: 'gap-2 p-2 text-accent' }} />
			<Popover.Dialog className='p-2' />
			<Resizable.Panel className='rounded-lg' />
			<Modal.Dialog className='gap-3' />
			<AlertDialog.Dialog className='p-4' />
			<Sheet.Dialog className='pt-12' />
			<Card className='gap-4' />
			<ListView className='p-2' />
		</>
	)
}
`,
			},
		])

		expect(violations.map(({ ruleId, tag, token }) => ({ ruleId, tag, token }))).toEqual([
			{ ruleId: 'heroui-skin-style', tag: 'Button', token: 'rounded-lg' },
			{ ruleId: 'heroui-state-style', tag: 'Button', token: 'hover:bg-danger' },
			{ ruleId: 'heroui-internal-metric', tag: 'Button', token: 'h-11' },
			{ ruleId: 'heroui-internal-metric', tag: 'Button', token: 'justify-start' },
			{ ruleId: 'heroui-internal-metric', tag: 'Dropdown.Item', token: 'gap-2' },
			{ ruleId: 'heroui-internal-metric', tag: 'Dropdown.Item', token: 'p-2' },
			{ ruleId: 'heroui-skin-style', tag: 'Dropdown.Item', token: 'text-accent' },
			{ ruleId: 'heroui-internal-metric', tag: 'Popover.Dialog', token: 'p-2' },
			{ ruleId: 'heroui-skin-style', tag: 'Resizable.Panel', token: 'rounded-lg' },
			{ ruleId: 'heroui-internal-metric', tag: 'Modal.Dialog', token: 'gap-3' },
			{ ruleId: 'heroui-internal-metric', tag: 'AlertDialog.Dialog', token: 'p-4' },
			{ ruleId: 'heroui-internal-metric', tag: 'Sheet.Dialog', token: 'pt-12' },
			{ ruleId: 'heroui-internal-metric', tag: 'Card', token: 'gap-4' },
			{ ruleId: 'heroui-internal-metric', tag: 'ListView', token: 'p-2' },
		])
	})

	test('拒绝 important、内部 icon metric 与并行视觉入口', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/layout/VisualDebt.tsx',
				source: `
import { Chip } from '@heroui/react'
import { oldButton } from '@/shared/components/base/button'
import { linkVariants } from '@heroui/styles'
import '@/styles/components.css'

void import('@/styles/adapters/shadcn.css')

export function VisualDebt() {
	return (
		<>
			<Chip className="!bg-danger [&_svg]:size-3.5 group-hover:opacity-50" />
			<div className="bg-sf-shell dark:bg-card" style={{ color: 'var(--sf-text-primary)' }} />
		</>
	)
}
`,
			},
		])

		expect(violations.map(({ ruleId }) => ruleId)).toEqual([
			'legacy-visual-style',
			'legacy-visual-style',
			'legacy-visual-style',
			'legacy-visual-import',
			'parallel-visual-import',
			'parallel-visual-import',
			'legacy-visual-import',
			'heroui-important-style',
			'heroui-internal-metric',
			'heroui-state-style',
		])
	})

	test('UI Lab CSS 只保留 fixture，并由共享主题持有实际视觉值', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/ui-lab/uiLab.css',
				source: `
.checkbox--primary {
	--field-shadow: #ffffff;
}
[data-theme="stoneflow-light"] .sidebar {
	background: rgb(239 239 240);
}
[data-row-shell] {
	background: var(--default);
}
.ui-lab-menu-search {
	background: var(--overlay);
}
[data-ui-lab-task-rows] [data-row-shell] {
	background: var(--default);
}
`,
			},
			{
				path: 'src/styles/components.css',
				source: `.menu-item { background: oklch(94% 0.001 286.375); }`,
			},
		])

		expect(violations.map(({ path, ruleId }) => ({ path, ruleId }))).toEqual([
			{ path: 'src/ui-lab/uiLab.css', ruleId: 'visual-token-bypass' },
			{ path: 'src/ui-lab/uiLab.css', ruleId: 'visual-token-bypass' },
			{ path: 'src/ui-lab/uiLab.css', ruleId: 'ui-lab-shared-recipe' },
			{ path: 'src/ui-lab/uiLab.css', ruleId: 'ui-lab-shared-recipe' },
			{ path: 'src/ui-lab/uiLab.css', ruleId: 'ui-lab-shared-recipe' },
			{ path: 'src/ui-lab/uiLab.css', ruleId: 'ui-lab-shared-recipe' },
			{ path: 'src/styles/components.css', ruleId: 'visual-token-bypass' },
		])
	})

	test('允许结构布局、外部几何与显式内容高度', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/features/launcher/chrome/LauncherSurface.tsx',
				source: `
import { Button, Form, Modal, RadioGroup, Surface, TextArea, Tooltip } from '@heroui/react'
import { ContextMenu, ListView, Resizable } from '@heroui-pro/react'

export function Geometry({ visible }) {
	return (
		<>
			<Button className="relative min-h-12 w-full overflow-hidden" data-content-height="true" />
			<Button className="h-11" data-content-height={false} />
			<TextArea className="min-h-24 resize-y overflow-x-hidden" />
			<Form className="flex min-h-0 flex-col" />
			<RadioGroup className="grid gap-2 md:grid-cols-2" />
			<Surface
				className={visible ? 'flex opacity-100' : 'flex pointer-events-none opacity-0'}
				data-native-window-surface="true"
			/>
			<Resizable.Panel className="flex min-w-0" />
			<ContextMenu.Trigger className="flex group-data-[sidebar-mode=icon]/sidebar:justify-center" />
			<ListView.ItemAction className="hidden shrink-0 md:flex" />
			<Tooltip.Content className="max-w-64" />
			<Modal.Dialog render={() => <section className="rounded-lg" />} />
		</>
	)
}
`,
			},
			{
				path: 'src/layout/VisualDebt.test.tsx',
				source: `
import { Button } from '@heroui/react'
import { oldButton } from '@/shared/components/base/button'
export const Fixture = () => <Button className="rounded-lg" />
`,
			},
		])

		expect(violations.map(({ ruleId, tag, token }) => ({ ruleId, tag, token }))).toEqual([
			{ ruleId: 'heroui-internal-metric', tag: 'Button', token: 'h-11' },
		])
	})

	test('允许锁定版 HeroUI 官方传入 Radix 与 tw-animate-css', () => {
		const violations = scanUiRepositoryContract({
			manifest: {
				path: 'package.json',
				source: JSON.stringify({
					dependencies: {
						'@heroui/react': '3.2.4',
						'@heroui/styles': '3.2.4',
					},
				}),
			},
			lockfile: {
				path: 'bun.lock',
				source: JSON.stringify({
					workspaces: {
						'': {
							dependencies: {
								'@heroui/react': '3.2.4',
								'@heroui/styles': '3.2.4',
							},
						},
					},
					packages: {
						'@heroui/react': [
							'@heroui/react@3.2.4',
							'',
							{ dependencies: { '@radix-ui/react-avatar': '1.1.11' } },
						],
						'@heroui/styles': [
							'@heroui/styles@3.2.4',
							'',
							{ dependencies: { 'tw-animate-css': '1.4.0' } },
						],
						'@radix-ui/react-avatar': [
							'@radix-ui/react-avatar@1.1.11',
							'',
							{ dependencies: { '@radix-ui/react-context': '1.1.3' } },
						],
						'@radix-ui/react-context': ['@radix-ui/react-context@1.1.3', ''],
						'tw-animate-css': ['tw-animate-css@1.4.0', ''],
					},
				}),
			},
			sourcePaths: TERMINAL_STYLE_PATHS,
		})

		expect(violations).toEqual([])
	})

	test('拒绝旧直依赖、非 HeroUI 来源与旧文件结构回流', () => {
		const violations = scanUiRepositoryContract({
			manifest: {
				path: 'package.json',
				source: JSON.stringify({
					dependencies: {
						'@radix-ui/react-avatar': '1.2.6',
						'class-variance-authority': '0.7.1',
						'radix-ui': '1.6.7',
						'react-day-picker': '10.0.1',
						sonner: '2.0.8',
					},
				}),
			},
			lockfile: {
				path: 'bun.lock',
				source: JSON.stringify({
					workspaces: { '': { dependencies: { cmdk: '1.1.1' } } },
					packages: { 'tw-animate-css': ['tw-animate-css@1.4.0', ''] },
				}),
			},
			sourcePaths: [
				...TERMINAL_STYLE_PATHS,
				'src/shared/lib/interaction-layer.ts',
				'src/styles/primitive.css',
			],
		})

		expect(violations.map(({ ruleId }) => ruleId)).toEqual([
			'legacy-ui-dependency',
			'legacy-ui-dependency',
			'legacy-ui-dependency',
			'legacy-ui-dependency',
			'legacy-ui-dependency',
			'legacy-ui-dependency',
			'dependency-provenance',
			'legacy-visual-path',
			'legacy-visual-path',
		])
	})
})
