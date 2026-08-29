import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { HEROUI_REGISTRATIONS } from '../src/ui-lab/catalog/heroUiRegistrations'
import { STONEFLOW_CATALOG_REGISTRATIONS } from '../src/ui-lab/catalog/stoneFlowRegistrations'
import { scanFeatureBoundarySources, scanUiRepositoryContract } from './check-feature-boundaries'

const TERMINAL_STYLE_PATHS = [
	'src/styles/base.css',
	'src/styles/components.css',
	'src/styles/fonts.css',
	'src/styles/index.css',
	'src/styles/theme.css',
]

describe('feature and HeroUI boundary scanner', () => {
	test('锁定版 HeroUI 的全部公开组件 subpath 都进入同一 registration', () => {
		for (const [packageName, packageDirectory, nonComponentExports] of [
			['@heroui/react', '@heroui/react', new Set(['./package.json', './rac', './styles'])],
			['@heroui-pro/react', '@heroui-pro/react', new Set(['./css', './package.json'])],
		] as const) {
			const packageJson = JSON.parse(
				readFileSync(
					join(import.meta.dir, '..', 'node_modules', packageDirectory, 'package.json'),
					'utf8',
				),
			) as { exports: Record<string, unknown>; version: string }
			const publicComponents = Object.keys(packageJson.exports)
				.filter(
					(path) => path.startsWith('./') && !path.includes('*') && !nonComponentExports.has(path),
				)
				.map((path) => `${packageName}${path.slice(1)}`)
				.sort()
			const registeredComponents = HEROUI_REGISTRATIONS.filter(
				(entry) => entry.packageName === packageName && entry.exportKind === 'component',
			)
				.map((entry) => entry.exportPath)
				.sort()

			expect(registeredComponents).toEqual(publicComponents)
			expect(
				HEROUI_REGISTRATIONS.filter((entry) => entry.packageName === packageName).every(
					(entry) => entry.packageVersion === packageJson.version,
				),
			).toBe(true)
		}
	})

	test('StoneFlow registration 的定义与直接消费者路径都存在', () => {
		expect(
			STONEFLOW_CATALOG_REGISTRATIONS.every(
				(entry) => existsSync(entry.definitionPath) && entry.consumers.every(existsSync),
			),
		).toBe(true)
	})

	test('HeroUI catalog 门禁允许已登记家族、alias、type-only、函数 API 与公开 subpath', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/layout/ShellHeader.tsx',
				source: `
// import { CommentOnlyUnknown } from '@heroui/react'
const documentation = '@heroui/react'
import { Button as HeroButton } from '@heroui/react'
void documentation
void HeroButton
`,
			},
			{
				path: 'src/features/update/hooks/useManualUpdateCheck.ts',
				source: `
import { toast } from '@heroui/react/toast'
void toast
`,
			},
			{
				path: 'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
				source: `
import { Resizable as Layout } from '@heroui-pro/react/resizable'
void Layout
`,
			},
			{
				path: 'src/features/filter/components/FilterBar.tsx',
				source: `
import { type Selection } from '@heroui/react'
import type { UnknownDocumentationType } from '@heroui/react'
type Selected = Selection
`,
			},
			{
				path: 'src/ui-lab/Unknown.tsx',
				source: `import { UnregisteredLabOnly } from '@heroui/react'`,
			},
			{
				path: 'src/layout/Unknown.test.tsx',
				source: `import { UnregisteredTestOnly } from '@heroui/react'`,
			},
			{
				path: 'src/features/task/testing/Unknown.tsx',
				source: `import { UnregisteredTestingOnly } from '@heroui/react'`,
			},
			{
				path: 'src/archive/Unknown.tsx',
				source: `import { UnregisteredArchivedOnly } from '@heroui/react'`,
			},
			{
				path: 'src/routes/debug.unknown.tsx',
				source: `import { UnregisteredDebugOnly } from '@heroui/react'`,
			},
		])

		expect(violations.filter(({ ruleId }) => ruleId === 'heroui-catalog-drift')).toEqual([])
	})

	test('HeroUI catalog 门禁拒绝未登记、未采用、消费漂移与无法映射的 runtime import', () => {
		const violations = scanFeatureBoundarySources([
			{
				path: 'src/layout/CatalogDrift.tsx',
				source: `
/* import { BlockCommentOnlyUnknown } from '@heroui/react' */
import { Accordion, ActionBar, Button, Selection, UnregisteredWidget } from '@heroui/react'
import * as HeroUIPro from '@heroui-pro/react'
export { Button as ReExportedButton } from '@heroui/react'
void import('@heroui-pro/react')
void Accordion
void ActionBar
void Button
void Selection
void UnregisteredWidget
void HeroUIPro
`,
			},
		]).filter(({ ruleId }) => ruleId === 'heroui-catalog-drift')

		expect(violations).toHaveLength(8)
		expect(violations.map(({ detail }) => detail)).toEqual(
			expect.arrayContaining([
				'@heroui/react 的 Accordion 仍登记为 no-current-scenario',
				'@heroui/react 的 runtime ActionBar 尚未登记',
				'@heroui/react 的 Button 尚未登记消费者 src/layout/CatalogDrift.tsx',
				'@heroui/react 的 runtime Selection 尚未登记',
				'@heroui/react 的 runtime UnregisteredWidget 尚未登记',
				'@heroui-pro/react 使用了无法映射到 catalog 家族的 runtime import/export',
				'@heroui/react 使用了无法映射到 catalog 家族的 runtime import/export',
				'@heroui-pro/react 的动态 import 无法映射到 catalog 家族',
			]),
		)
	})

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
		]).filter(({ ruleId }) => ruleId !== 'heroui-catalog-drift')

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
		]).filter(({ ruleId }) => ruleId !== 'heroui-catalog-drift')

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
[data-ui-lab-semantic-feedback] [data-slot="input"] {
	border-color: var(--danger);
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
		]).filter(({ ruleId }) => ruleId !== 'heroui-catalog-drift')

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
