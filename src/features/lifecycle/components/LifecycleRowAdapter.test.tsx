import { fireEvent, screen, waitFor } from '@testing-library/react'

import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	createEmptyCommandContext,
	type Command,
} from '@/features/command'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { LifecycleRowAdapter, type LifecycleRowAdapterProps } from './LifecycleRowAdapter'

describe('LifecycleRowAdapter', () => {
	it('恢复按钮执行 row singleton command projection', async () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const runCommand = vi.fn()
		const actions = buildActions()
		renderLifecycleRow({ actions, entry, runCommand })

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))
		const checkbox = screen.getByRole('checkbox', { name: '选择 任务 A' })
		fireEvent.pointerDown(checkbox)
		fireEvent.click(checkbox)

		await waitFor(() => {
			expect(runCommand).toHaveBeenCalledWith(
				expect.objectContaining({
					selection: expect.objectContaining({ ids: ['task-1'] }),
				}),
				{ source: 'row' },
			)
		})
		expect(actions.onOpenDetail).not.toHaveBeenCalled()
		expect(actions.onToggleSelected).toHaveBeenCalledTimes(1)
	})

	it('仅 archive 的 task/space 行保留直接打开结果', () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const actions = buildActions()
		renderLifecycleRow({ entry, actions, mode: 'archive' })

		fireEvent.click(screen.getByRole('row', { name: '打开 任务 A' }))
		expect(actions.onOpenDetail).toHaveBeenCalledWith(entry)
	})

	it('多选右键永久删除使用完整目标快照', async () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const sibling = createEntry({ id: 'task-2', entityType: 'task', title: '任务 B' })
		const runCommand = vi.fn()
		renderLifecycleRow({
			entry,
			contextEntries: [entry, sibling],
			mode: 'trash',
			runCommand,
		})

		fireEvent.contextMenu(screen.getByRole('row', { name: '任务 A' }))
		expect(screen.queryByRole('menuitem', { name: '打开详情' })).not.toBeInTheDocument()
		fireEvent.click(await screen.findByRole('menuitem', { name: '全部永久删除' }))

		await waitFor(() => {
			expect(runCommand).toHaveBeenCalledWith(
				expect.objectContaining({
					selection: expect.objectContaining({ ids: ['task-1', 'task-2'] }),
				}),
				{ source: 'context-menu' },
			)
		})
	})
})

function renderLifecycleRow({
	entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' }),
	contextEntries,
	mode = 'archive',
	actions = buildActions(),
	runCommand = vi.fn(),
}: {
	entry?: LifecycleEntry
	contextEntries?: LifecycleEntry[]
	mode?: LifecycleMode
	actions?: LifecycleRowAdapterProps['actions']
	runCommand?: Command['run']
} = {}) {
	const context = createEmptyCommandContext()
	context.route.page = mode === 'archive' ? 'archive' : 'trash'
	const runtime = new CommandRuntime({
		registry: new CommandRegistry(createLifecycleCommands(runCommand)),
		getContext: () => context,
	})

	return render(
		<CommandRuntimeProvider context={context} runtime={runtime}>
			<LifecycleRowAdapter
				actions={actions}
				contextEntries={contextEntries}
				entry={entry}
				mode={mode}
				rowState={{ focusSource: null, isFocused: false, isSelected: !!contextEntries }}
			/>
		</CommandRuntimeProvider>,
	)
}

function createLifecycleCommands(run: Command['run']): Command[] {
	return [
		createCommand(COMMAND_IDS.lifecycleRestore, '恢复', run),
		createCommand(COMMAND_IDS.lifecycleDelete, '删除', run, 'archive'),
		createCommand(COMMAND_IDS.lifecycleDeletePermanently, '永久删除', run, 'trash'),
	]
}

function createCommand(
	id: Command['id'],
	title: string,
	run: Command['run'],
	page?: 'archive' | 'trash',
): Command {
	return {
		id,
		title,
		category: 'lifecycle',
		scope: ['task-list'],
		isEnabled: (ctx) => ctx.selection.type === 'lifecycle' && ctx.selection.ids.length > 0,
		isVisible: page ? (ctx) => ctx.route.page === page : undefined,
		run,
	}
}

function buildActions(): LifecycleRowAdapterProps['actions'] {
	return {
		onToggleSelected: vi.fn(),
		onOpenDetail: vi.fn(),
	}
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
