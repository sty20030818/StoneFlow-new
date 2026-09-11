import { fireEvent, screen, waitFor, within } from '@testing-library/react'

import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	createEmptyCommandContext,
	type Command,
	type CommandInvocation,
} from '@/features/command'
import type { ProjectOverviewItem } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { ProjectRowAdapter, type ProjectRowAdapterProps } from './ProjectRowAdapter'

describe('ProjectRowAdapter', () => {
	it('整行打开与完成动作仍走项目领域回调', () => {
		const actions = buildActions()
		renderProjectRow({ actions })

		fireEvent.click(screen.getByRole('row', { name: '打开项目 项目 A' }))
		fireEvent.click(screen.getByRole('button', { name: '完成' }))
		const checkbox = screen.getByRole('checkbox', { name: '选择项目 项目 A' })
		fireEvent.pointerDown(checkbox)
		fireEvent.click(checkbox)

		expect(actions.onOpenProject).toHaveBeenCalledWith('project-1')
		expect(actions.onOpenProject).toHaveBeenCalledTimes(1)
		expect(actions.onCompleteProject).toHaveBeenCalledWith('project-1')
		expect(actions.onToggleSelected).toHaveBeenCalledTimes(1)
	})

	it('属性入口展示截止与创建时间，不触发打开项目', async () => {
		const actions = buildActions()
		renderProjectRow({
			actions,
			project: createProject({ id: 'project-1', name: '项目 A', dueAt: '2026-05-08T08:00:00Z' }),
		})

		fireEvent.click(screen.getByRole('button', { name: '查看项目 项目 A 的属性' }))
		const dialog = await screen.findByRole('dialog', { name: '项目 项目 A 的属性' })
		expect(within(dialog).getByText('截止时间')).toBeInTheDocument()
		expect(within(dialog).getByText('截止 5/8')).toBeInTheDocument()
		expect(within(dialog).getByText('创建时间')).toBeInTheDocument()
		expect(within(dialog).getByText('创建 5/1')).toBeInTheDocument()
		const dueDate = within(dialog).getByText('截止 5/8')
		expect(dueDate.closest('[data-metadata-field-value]')).toHaveAttribute(
			'data-metadata-field-value',
			'true',
		)
		expect(dueDate.closest('button, [role="button"]')).toBeNull()
		expect(
			within(dialog).getByText('创建 5/1').closest('[data-metadata-field-value], button'),
		).toBeNull()
		fireEvent.click(dueDate)
		expect(actions.onOpenProject).not.toHaveBeenCalled()
		expect(actions.onToggleSelected).not.toHaveBeenCalled()
	})

	it('归档与删除统一通过右键菜单执行 context-menu command projection', async () => {
		const runCommand =
			vi.fn<
				(ctx: ReturnType<typeof createEmptyCommandContext>, invocation: CommandInvocation) => void
			>()
		renderProjectRow({ runCommand })

		const row = screen.getByRole('row', { name: '打开项目 项目 A' })
		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '归档项目' }))
		await waitFor(() => {
			expect(runCommand).toHaveBeenCalledWith(
				expect.objectContaining({
					selection: expect.objectContaining({ ids: ['project-1'] }),
				}),
				{ source: 'context-menu' },
			)
		})

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '移入回收站' }))

		await waitFor(() => {
			expect(runCommand).toHaveBeenLastCalledWith(
				expect.objectContaining({
					selection: expect.objectContaining({ ids: ['project-1'] }),
				}),
				{ source: 'context-menu' },
			)
		})
	})
})

function renderProjectRow({
	actions = buildActions(),
	project = createProject({ id: 'project-1', name: '项目 A' }),
	runCommand = vi.fn(),
}: {
	actions?: ProjectRowAdapterProps['actions']
	project?: ProjectOverviewItem
	runCommand?: (
		ctx: ReturnType<typeof createEmptyCommandContext>,
		invocation: CommandInvocation,
	) => void
} = {}) {
	const context = createEmptyCommandContext()
	const commands: Command[] = [COMMAND_IDS.projectArchive, COMMAND_IDS.projectDelete].map((id) => ({
		id,
		title: id === COMMAND_IDS.projectArchive ? '归档项目' : '删除项目',
		category: 'project',
		scope: ['project-list'],
		isEnabled: (ctx) => ctx.selection.type === 'project' && ctx.selection.ids.length > 0,
		run: runCommand,
	}))
	const runtime = new CommandRuntime({
		registry: new CommandRegistry(commands),
		getContext: () => context,
	})

	return render(
		<CommandRuntimeProvider context={context} runtime={runtime}>
			<ProjectRowAdapter
				actions={actions}
				project={project}
				rowState={{
					focusSource: null,
					isFocused: false,
					isPending: false,
					isSelected: false,
				}}
			/>
		</CommandRuntimeProvider>,
	)
}

function buildActions(): ProjectRowAdapterProps['actions'] {
	return {
		onOpenProject: vi.fn(),
		onCompleteProject: vi.fn(),
		onReopenProject: vi.fn(),
		onToggleSelected: vi.fn(),
	}
}

function createProject(
	overrides: Partial<ProjectOverviewItem> & Pick<ProjectOverviewItem, 'id' | 'name'>,
): ProjectOverviewItem {
	return {
		id: overrides.id,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '个人',
		name: overrides.name,
		description: overrides.description ?? null,
		status: overrides.status ?? 'todo',
		priority: overrides.priority ?? 0,
		plannedAt: overrides.plannedAt ?? null,
		dueAt: overrides.dueAt ?? null,
		remindAt: overrides.remindAt ?? null,
		statusChangedAt: overrides.statusChangedAt ?? '2026-05-01T00:00:00Z',
		position: overrides.position ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-01T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00Z',
	}
}
