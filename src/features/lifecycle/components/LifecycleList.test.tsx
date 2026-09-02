import type { ReactNode } from 'react'
import { fireEvent, screen } from '@testing-library/react'

import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	createEmptyCommandContext,
	type Command,
} from '@/features/command'
import { LifecycleList } from '@/features/lifecycle/components/LifecycleList'
import type { LifecycleEntry, LifecycleMode, Scope } from '@/shared/types'
import { renderWithRouterContext } from '@/test/renderWithRouter'

const openTaskDetailSpy = vi.fn<(taskId: string) => void>()
const refetchLifecycleSpy = vi.fn()
let mockScope: Scope = { type: 'all' }
let archiveState = createQueryState(createEntries('archive'))
let trashState = createQueryState(createEntries('trash'))

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({
		openTaskDetail: openTaskDetailSpy,
	}),
}))

vi.mock('@/features/lifecycle/hooks/lifecycle.queries', () => ({
	useLifecycleEntriesQuery: (mode: LifecycleMode) => {
		const state = mode === 'archive' ? archiveState : trashState
		return {
			data: state.items,
			isError: state.status === 'error',
			isLoadingError: state.status === 'error',
			isLoading: state.status === 'loading',
			isPending: state.status === 'loading',
			error: state.error,
			refetch: refetchLifecycleSpy,
		}
	},
}))

vi.mock('@/app/navigation/ShellRouteContext', () => ({
	useCurrentShellRoute: () => ({
		scope: mockScope,
		spaceId: mockScope.type === 'space' ? mockScope.spaceId : null,
	}),
}))

describe('LifecycleList', () => {
	beforeEach(() => {
		mockScope = { type: 'all' }
		archiveState = createQueryState(createEntries('archive'))
		trashState = createQueryState(createEntries('trash'))
		openTaskDetailSpy.mockReset()
		refetchLifecycleSpy.mockReset()
	})

	it('Archive 模式保留空间、项目、任务三分区', async () => {
		await renderLifecycleList('archive')

		expect(screen.getByText('已归档的空间')).toBeInTheDocument()
		expect(screen.getByText('已归档的项目')).toBeInTheDocument()
		expect(screen.getByText('已归档的任务')).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '恢复' })).toHaveLength(3)
	})

	it('Trash 空查询结果展示标准空态', async () => {
		trashState = createQueryState([])
		await renderLifecycleList('trash')

		expect(screen.getByText('当前没有已删除内容')).toBeInTheDocument()
		expect(
			screen.getByText(
				'删除后的任务和项目会先来到这里。点「返回独立事项」先回去继续处理内容就好。',
			),
		).toBeInTheDocument()
	})

	it('查询失败保留页面错误结果', async () => {
		archiveState = { items: [], status: 'error', error: new Error('读取失败') }
		await renderLifecycleList('archive')

		expect(screen.getByRole('alert')).toHaveTextContent('读取归档失败')
		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(refetchLifecycleSpy).toHaveBeenCalledOnce()
	})
})

async function renderLifecycleList(mode: LifecycleMode) {
	return renderWithRouterContext(
		<LifecycleCommandBoundary mode={mode}>
			<LifecycleList mode={mode} />
		</LifecycleCommandBoundary>,
	)
}

function LifecycleCommandBoundary({
	children,
	mode,
}: {
	children: ReactNode
	mode: LifecycleMode
}) {
	const context = createEmptyCommandContext()
	context.route.page = mode === 'archive' ? 'archive' : 'trash'
	const runtime = new CommandRuntime({
		registry: new CommandRegistry(createLifecycleCommands()),
		getContext: () => context,
	})

	return (
		<CommandRuntimeProvider context={context} runtime={runtime}>
			{children}
		</CommandRuntimeProvider>
	)
}

function createLifecycleCommands(): Command[] {
	return [
		createCommand(COMMAND_IDS.lifecycleRestore, '恢复'),
		createCommand(COMMAND_IDS.lifecycleDelete, '删除', 'archive'),
		createCommand(COMMAND_IDS.lifecycleDeletePermanently, '永久删除', 'trash'),
	]
}

function createCommand(id: Command['id'], title: string, page?: 'archive' | 'trash'): Command {
	return {
		id,
		title,
		category: 'lifecycle',
		scope: ['task-list'],
		isEnabled: (ctx) => ctx.selection.type === 'lifecycle' && ctx.selection.ids.length > 0,
		isVisible: page ? (ctx) => ctx.route.page === page : undefined,
		run: () => undefined,
	}
}

function createQueryState(items: LifecycleEntry[]) {
	return {
		items,
		status: 'ready' as 'loading' | 'ready' | 'error',
		error: null as Error | null,
	}
}

function createEntries(mode: LifecycleMode): LifecycleEntry[] {
	return [
		createEntry({ id: 'space-1', entityType: 'space', title: '工作', mode }),
		createEntry({ id: 'project-1', entityType: 'project', title: '阶段 K', mode }),
		createEntry({ id: 'task-1', entityType: 'task', title: '完成生命周期迁移', mode }),
	]
}

function createEntry({
	id,
	entityType,
	title,
	mode,
}: Pick<LifecycleEntry, 'id' | 'entityType' | 'title'> & { mode: LifecycleMode }): LifecycleEntry {
	return {
		id,
		entityType,
		title,
		spaceId: 'space-1',
		spaceName: '工作',
		projectId: entityType === 'task' ? 'project-1' : null,
		projectName: entityType === 'task' ? '阶段 K' : null,
		archivedAt: mode === 'archive' ? '2026-08-19T00:00:00Z' : null,
		deletedAt: mode === 'trash' ? '2026-08-19T00:00:00Z' : null,
		sourceType: 'self',
		sourceId: id,
		restoreHint: '恢复提示',
	}
}
