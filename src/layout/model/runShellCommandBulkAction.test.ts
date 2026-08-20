import { createEmptyCommandContext } from '@/features/command'

import { createRunEntityBulkActionFromCommand } from './runShellCommandBulkAction'

vi.mock('@heroui/react', async (importOriginal) => ({
	...(await importOriginal<typeof import('@heroui/react')>()),
	toast: { success: vi.fn(), danger: vi.fn() },
}))

describe('createRunEntityBulkActionFromCommand', () => {
	it('允许 row invocation 执行单条快照', async () => {
		const runBulkAction = vi.fn(async (actionId: string, snapshot: { ids: string[] }) => ({
			status: 'success' as const,
			actionId,
			entity: 'project' as const,
			requestedIds: snapshot.ids,
			succeededIds: snapshot.ids,
			failedIds: [],
			skippedIds: [],
		}))
		const run = createRunEntityBulkActionFromCommand(runBulkAction)
		const context = createProjectCommandContext(['project-a'])

		await run(context, { source: 'row' }, 'project', 'project.archiveSelected', {
			successVerb: '处理',
			entityLabel: '项目',
		})

		expect(runBulkAction).toHaveBeenCalledWith(
			'project.archiveSelected',
			expect.objectContaining({
				entity: 'project',
				ids: ['project-a'],
				source: 'row',
			}),
			undefined,
		)
	})

	it('拒绝 row invocation 携带多条选择', async () => {
		const runBulkAction = vi.fn()
		const run = createRunEntityBulkActionFromCommand(runBulkAction)

		await expect(
			run(
				createProjectCommandContext(['project-a', 'project-b']),
				{ source: 'row' },
				'project',
				'project.archiveSelected',
				{ successVerb: '处理', entityLabel: '项目' },
			),
		).rejects.toThrow('行操作只能执行单条命令')
		expect(runBulkAction).not.toHaveBeenCalled()
	})
})

function createProjectCommandContext(ids: string[]) {
	const context = createEmptyCommandContext()
	return {
		...context,
		selection: {
			...context.selection,
			type: 'project' as const,
			ids,
			entities: ids.map((id) => ({ id, type: 'project' as const, title: id })),
			source: 'project-list' as const,
			hasSelection: true,
			isSingleSelection: ids.length === 1,
			isMultiSelection: ids.length > 1,
		},
	}
}
