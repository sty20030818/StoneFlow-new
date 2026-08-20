import { describe, expect, test } from 'bun:test'

import { scanFeatureBoundarySources } from './check-feature-boundaries'

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
})
