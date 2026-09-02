import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useMemo, useState } from 'react'

import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	createEmptyCommandContext,
	type Command,
} from '@/features/command'
import { useGroupedCollectionInteraction } from '@/features/selection'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { LIFECYCLE_SECTION_ORDER } from '../model/buildLifecycleSections'
import { LifecycleBoard, type LifecycleBoardSection } from './LifecycleBoard'

describe('LifecycleBoard', () => {
	it('异步加载到首批 section 后保持默认展开', async () => {
		render(<LifecycleBoardAsyncHarness />)

		expect(screen.queryByRole('row', { name: '打开 任务 A' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '加载数据' }))

		await waitFor(() => {
			expect(screen.getByRole('row', { name: '打开 任务 A' })).toBeInTheDocument()
		})
		expect(screen.getByRole('button', { name: '折叠 已归档的任务' })).toHaveAttribute(
			'aria-expanded',
			'true',
		)
	})

	it('右键已选中行时命令目标使用全部已选条目', async () => {
		const sections: LifecycleBoardSection[] = [
			{
				key: 'task',
				label: '已删除的任务',
				items: [
					createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' }),
					createEntry({ id: 'task-2', entityType: 'task', title: '任务 B' }),
				],
			},
		]
		const runCommand = vi.fn()

		render(
			<LifecycleBoardHarness
				defaultSelectedKeys={['task-1', 'task-2']}
				mode='trash'
				runCommand={runCommand}
				sections={sections}
			/>,
		)

		fireEvent.contextMenu(screen.getByRole('row', { name: '任务 A' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '全部恢复' }))

		await waitFor(() => {
			expect(runCommand).toHaveBeenCalledWith(
				expect.objectContaining({
					selection: expect.objectContaining({ ids: ['task-1', 'task-2'] }),
				}),
				{ source: 'context-menu' },
			)
		})
	})

	it('连续选择位置通过 BoardRowSlot 公共 hook 暴露', () => {
		const sections: LifecycleBoardSection[] = [
			{
				key: 'task',
				label: '已归档的任务',
				items: [
					createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' }),
					createEntry({ id: 'task-2', entityType: 'task', title: '任务 B' }),
				],
			},
		]
		render(
			<LifecycleBoardHarness
				defaultSelectedKeys={['task-1', 'task-2']}
				mode='archive'
				sections={sections}
			/>,
		)

		expect(
			screen.getByRole('row', { name: '任务 A' }).closest('[data-board-row-slot]'),
		).toHaveAttribute('data-selection-group-position', 'first')
		expect(
			screen.getByRole('row', { name: '任务 B' }).closest('[data-board-row-slot]'),
		).toHaveAttribute('data-selection-group-position', 'last')
	})

	it('错误态重试调用公开 onRetry', () => {
		const onRetry = vi.fn()
		render(<LifecycleBoardHarness mode='trash' onRetry={onRetry} sections={[]} status='error' />)

		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(onRetry).toHaveBeenCalledOnce()
	})
})

function LifecycleBoardAsyncHarness() {
	const [sections, setSections] = useState<LifecycleBoardSection[]>([])

	return (
		<div>
			<button
				onClick={() =>
					setSections([
						{
							key: 'task',
							label: '已归档的任务',
							items: [createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })],
						},
					])
				}
				type='button'
			>
				加载数据
			</button>
			<LifecycleBoardHarness mode='archive' sections={sections} />
		</div>
	)
}

function LifecycleBoardHarness({
	mode,
	sections,
	defaultSelectedKeys = [],
	onRetry = () => undefined,
	runCommand = vi.fn(),
	status = 'ready',
}: {
	mode: LifecycleMode
	sections: LifecycleBoardSection[]
	defaultSelectedKeys?: string[]
	onRetry?: () => void | Promise<unknown>
	runCommand?: Command['run']
	status?: 'idle' | 'loading' | 'ready' | 'error'
}) {
	const groups = useMemo(
		() =>
			sections.map((section) => ({
				key: section.key,
				itemKeys: section.items.map((entry) => entry.id),
			})),
		[sections],
	)
	const collection = useGroupedCollectionInteraction({
		groups,
		defaultOpenGroupKeys: LIFECYCLE_SECTION_ORDER,
		defaultSelectedKeys,
	})
	const context = createEmptyCommandContext()
	context.route.page = mode === 'archive' ? 'archive' : 'trash'
	const commands = createLifecycleCommands(runCommand)
	const runtime = new CommandRuntime({
		registry: new CommandRegistry(commands),
		getContext: () => context,
	})

	return (
		<CommandRuntimeProvider context={context} runtime={runtime}>
			<LifecycleBoard
				collection={collection}
				emptyDescription='empty'
				emptyTitle='empty'
				mode={mode}
				onOpenDetail={() => undefined}
				onRetry={onRetry}
				sections={sections}
				status={status}
			/>
		</CommandRuntimeProvider>
	)
}

function createLifecycleCommands(run: Command['run']): Command[] {
	return [
		{ id: COMMAND_IDS.lifecycleRestore, title: '恢复' },
		{ id: COMMAND_IDS.lifecycleDelete, title: '删除', page: 'archive' as const },
		{
			id: COMMAND_IDS.lifecycleDeletePermanently,
			title: '永久删除',
			page: 'trash' as const,
		},
	].map(({ id, title, page }) => ({
		id,
		title,
		category: 'lifecycle',
		scope: ['task-list'],
		isEnabled: (ctx) => ctx.selection.type === 'lifecycle' && ctx.selection.ids.length > 0,
		isVisible: page ? (ctx) => ctx.route.page === page : undefined,
		run,
	}))
}

function createEntry(
	overrides: Partial<LifecycleEntry> & Pick<LifecycleEntry, 'id' | 'entityType' | 'title'>,
): LifecycleEntry {
	return {
		id: overrides.id,
		entityType: overrides.entityType,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '工作',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		archivedAt: overrides.archivedAt ?? '2026-05-03T10:00:00Z',
		deletedAt: overrides.deletedAt ?? '2026-05-03T10:00:00Z',
		sourceType: overrides.sourceType ?? 'self',
		sourceId: overrides.sourceId ?? overrides.id,
		restoreHint: overrides.restoreHint ?? '恢复提示',
	}
}
