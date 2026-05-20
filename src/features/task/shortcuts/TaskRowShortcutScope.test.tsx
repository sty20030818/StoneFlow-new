import { act, fireEvent, render, screen } from '@testing-library/react'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'

import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	setGlobalChordPending,
	__resetGlobalChordGuardForTests,
} from '@/shared/lib/global-chord-guard'
import {
	BulkActionProvider,
	TASK_BULK_ACTION_IDS,
	useBulkActionContext,
	type BulkAction,
	type BulkActionId,
	type BulkActionResult,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action'
import type { TaskListItem } from '@/shared/types'

import { TaskRowShortcutScope } from './TaskRowShortcutScope'

type BulkActionCall = {
	actionId: BulkActionId
	snapshot: BulkSelectionSnapshot
}

describe('TaskRowShortcutScope', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		useDialogStore.setState({
			isCommandOpen: false,
			commandMenuMode: 'default',
			commandSelectionOverride: null,
		})
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
		__resetGlobalChordGuardForTests()
	})

	it('hover 行时 W 触发完成，X 触发选择', () => {
		const actions = createActions()
		const bulkCalls: BulkActionCall[] = []
		renderScope({ actions, bulkCalls })

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('w')
		fireKey('x')
		flushShortcutTimers()

		expect(bulkCalls).toEqual([
			expect.objectContaining({
				actionId: TASK_BULK_ACTION_IDS.completeSelected,
				snapshot: expect.objectContaining({
					ids: ['task-a'],
					source: 'row-shortcut',
				}),
			}),
		])
		expect(actions.onToggleTaskSelection).toHaveBeenCalledWith('task-a')
	})

	it('Space / Enter 打开目标任务', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey(' ')
		fireKey('Enter')
		flushShortcutTimers()

		expect(actions.onOpenTask).toHaveBeenNthCalledWith(1, 'task-a')
		expect(actions.onOpenTask).toHaveBeenNthCalledWith(2, 'task-a')
	})

	it('A / Delete / Cmd+Backspace 执行归档和删除', () => {
		const actions = createActions()
		const bulkCalls: BulkActionCall[] = []
		renderScope({ actions, bulkCalls })

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('a')
		fireKey('Delete')
		fireKey('Backspace', { metaKey: true })
		flushShortcutTimers()

		expect(bulkCalls.map((call) => call.actionId)).toEqual([
			TASK_BULK_ACTION_IDS.archiveSelected,
			TASK_BULK_ACTION_IDS.deleteSelected,
			TASK_BULK_ACTION_IDS.deleteSelected,
		])
		expect(bulkCalls.map((call) => call.snapshot.ids)).toEqual([['task-a'], ['task-a'], ['task-a']])
		expect(actions.onArchiveTask).not.toHaveBeenCalled()
		expect(actions.onDeleteTask).not.toHaveBeenCalled()
	})

	it('P / S / D / Shift+P 打开目标行的 Command scoped picker', () => {
		const actions = createActions()
		renderScope({ actions })

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('p')
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-priority-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])

		useDialogStore.getState().closeCommand()
		fireKey('s')
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-status-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])

		useDialogStore.getState().closeCommand()
		fireKey('d')
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-date-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])

		useDialogStore.getState().closeCommand()
		fireKey('P', { shiftKey: true })
		flushShortcutTimers()
		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-placement-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a'])
	})

	it('全局 chord 进行中时 Row 单键命令不触发（防止 f→p 同时触发 filterByPriority 和 taskSetPriority）', () => {
		const actions = createActions()
		const bulkCalls: BulkActionCall[] = []
		renderScope({ actions, bulkCalls })

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))

		// 模拟全局 chord 进入 pending（例如用户按下了 f、g、n 等前缀键）
		setGlobalChordPending(true)

		// chord 进行中时，p / s / d 等 Row 单键命令不应触发
		fireKey('p')
		fireKey('s')
		fireKey('d')
		flushShortcutTimers()

		expect(useDialogStore.getState().isCommandOpen).toBe(false)

		// chord 完成后（guard 重置），Row 单键命令恢复正常
		setGlobalChordPending(false)
		fireKey('p')
		flushShortcutTimers()

		expect(useDialogStore.getState().isCommandOpen).toBe(true)
		expect(useDialogStore.getState().commandMenuMode).toBe('task-priority-picker')
	})

	it('输入态和上层菜单打开时不触发', () => {
		const actions = createActions()
		renderScope({ actions, withBlockingLayer: true })

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('w')
		fireKey('x', { target: screen.getByLabelText('编辑标题') })
		flushShortcutTimers()

		expect(actions.onToggleTaskStatus).not.toHaveBeenCalled()
		expect(actions.onToggleTaskSelection).not.toHaveBeenCalled()
	})

	it('多选时 W / A / Delete 批量执行，Space / Enter 不执行', () => {
		const actions = createActions()
		const bulkCalls: BulkActionCall[] = []
		renderScope({
			actions,
			bulkCalls,
			selectedTaskIds: ['task-a', 'task-b'],
		})

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('w')
		fireKey('a')
		fireKey('Delete')
		fireKey(' ')
		fireKey('Enter')
		flushShortcutTimers()

		expect(bulkCalls.map((call) => call.actionId)).toEqual([
			TASK_BULK_ACTION_IDS.completeSelected,
			TASK_BULK_ACTION_IDS.archiveSelected,
			TASK_BULK_ACTION_IDS.deleteSelected,
		])
		expect(bulkCalls.map((call) => call.snapshot.ids)).toEqual([
			['task-a', 'task-b'],
			['task-a', 'task-b'],
			['task-a', 'task-b'],
		])
		expect(actions.onOpenTask).not.toHaveBeenCalled()
	})

	it('多选时 selection 优先于 hover row', () => {
		const bulkCalls: BulkActionCall[] = []
		renderScope({
			bulkCalls,
			selectedTaskIds: ['task-a'],
		})

		fireEvent.mouseMove(screen.getByTestId('row-task-b'))
		fireKey('w')
		flushShortcutTimers()

		expect(bulkCalls).toHaveLength(1)
		expect(bulkCalls[0]?.snapshot.ids).toEqual(['task-a'])
	})

	it('多选且没有 row target 时仍使用 selection 执行', () => {
		const bulkCalls: BulkActionCall[] = []
		renderScope({
			bulkCalls,
			selectedTaskIds: ['task-a', 'task-b'],
		})

		fireKey('w')
		flushShortcutTimers()

		expect(bulkCalls).toHaveLength(1)
		expect(bulkCalls[0]?.snapshot.ids).toEqual(['task-a', 'task-b'])
	})

	it('无 selection 且无 row target 时不执行 bulk action', () => {
		const bulkCalls: BulkActionCall[] = []
		renderScope({ bulkCalls })

		fireKey('w')
		flushShortcutTimers()

		expect(bulkCalls).toHaveLength(0)
	})

	it('archive/delete 成功并要求清理 selection 时调用清理回调', async () => {
		const actions = createActions()
		renderScope({
			actions,
			bulkResults: {
				[TASK_BULK_ACTION_IDS.archiveSelected]: { shouldClearSelection: true },
				[TASK_BULK_ACTION_IDS.deleteSelected]: { shouldClearSelection: true },
			},
		})

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('a')
		fireKey('Delete')
		await flushShortcutAsyncWork()

		expect(actions.onClearTaskSelection).toHaveBeenCalledTimes(2)
	})

	it('partial / failed / cancelled 不清理 selection', async () => {
		const actions = createActions()
		renderScope({
			actions,
			bulkResults: {
				[TASK_BULK_ACTION_IDS.archiveSelected]: {
					status: 'partial',
					shouldClearSelection: true,
				},
				[TASK_BULK_ACTION_IDS.deleteSelected]: {
					status: 'failed',
					shouldClearSelection: true,
				},
			},
		})

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('a')
		fireKey('Delete')
		await flushShortcutAsyncWork()

		expect(actions.onClearTaskSelection).not.toHaveBeenCalled()
	})

	it('归档快捷键进入 bulk confirmation，确认后才执行 action', async () => {
		const bulkCalls: BulkActionCall[] = []
		const pendingActions: Array<BulkActionId | null> = []
		let confirmPendingAction: (() => void) | null = null

		renderScope({
			bulkCalls,
			confirmingActionIds: [TASK_BULK_ACTION_IDS.archiveSelected],
			onBulkContext: (context) => {
				pendingActions.push(context.pendingConfirmation?.action.id ?? null)
				confirmPendingAction = context.confirmPendingAction
			},
		})

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('a')
		flushShortcutTimers()

		expect(pendingActions).toContain(TASK_BULK_ACTION_IDS.archiveSelected)
		expect(bulkCalls).toHaveLength(0)

		await act(async () => {
			confirmPendingAction?.()
		})

		expect(bulkCalls.map((call) => call.actionId)).toEqual([TASK_BULK_ACTION_IDS.archiveSelected])
	})

	it('多选时 P 使用 selection 作为 scoped picker 上下文', () => {
		const actions = createActions()
		renderScope({
			actions,
			selectedTaskIds: ['task-a', 'task-b'],
		})

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('p')
		flushShortcutTimers()

		expect(useDialogStore.getState().commandMenuMode).toBe('task-priority-picker')
		expect(useDialogStore.getState().commandSelectionOverride?.ids).toEqual(['task-a', 'task-b'])
	})

	it('ArrowDown / ArrowUp 只移动唯一 hover，不改变 selection', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('none')

		expect(fireKey('ArrowDown').defaultPrevented).toBe(false)
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('hover-source')).toHaveTextContent('keyboard')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowDown')
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowUp')
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('方向键优先从 hover 行开始移动 keyboard focus', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseMove(screen.getByTestId('row-task-b'))
		fireKey('ArrowDown')

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-c')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowUp')

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('上层浮层打开时忽略 pointer leave，冻结当前 hover 行', () => {
		const actions = createActions()
		renderSelectionScope({ actions, withBlockingLayer: true })

		fireEvent.pointerMove(screen.getByTestId('row-task-b'), { clientX: 8, clientY: 8 })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('hover-source')).toHaveTextContent('pointer')

		fireEvent.mouseLeave(screen.getByTestId('row-task-b'))

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('hover-source')).toHaveTextContent('pointer')
	})

	it('Shift+ArrowDown / Shift+ArrowUp 会逐行切换选中状态', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a')

		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b')

		fireKey('ArrowUp', { shiftKey: true })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a')

		fireKey('ArrowUp', { shiftKey: true })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('Shift+Arrow 从 hover 行开始时，先切换 hover 行再移动切换', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseMove(screen.getByTestId('row-task-b'))
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b')

		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-c')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b,task-c')
	})

	it('键盘接管后静止 hover 不会抢回 Shift+Arrow 焦点', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.pointerMove(screen.getByTestId('row-task-a'), { clientX: 8, clientY: 8 })
		fireKey('ArrowDown', { shiftKey: true })
		fireEvent.pointerMove(screen.getByTestId('row-task-a'), { clientX: 8, clientY: 8 })
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b')
	})

	it('Shift+Arrow 在已选中行上会取消该行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b')

		fireEvent.mouseMove(screen.getByTestId('row-task-a'))
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b')
	})

	it('部分选区从下边界反向时先取消下边界', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseMove(screen.getByTestId('row-task-c'))
		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-e')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d,task-e')

		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-e')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d')
	})

	it('部分选区从上边界反向时先取消上边界', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.mouseMove(screen.getByTestId('row-task-d'))
		fireKey('ArrowUp', { shiftKey: true })
		fireKey('ArrowUp', { shiftKey: true })
		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-b,task-c,task-d')

		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d')
	})

	it('全选后 Shift+Arrow 先取消当前边界行，再继续取消下一行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowDown', { shiftKey: true })
		}

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-f')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-a,task-b,task-c,task-d,task-e,task-f',
		)

		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-f')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-a,task-b,task-c,task-d,task-e',
		)

		fireKey('ArrowUp', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-e')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a,task-b,task-c,task-d')
	})

	it('全选后鼠标移动到第一行时 Shift+Arrow 先取消第一行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowDown', { shiftKey: true })
		}

		fireEvent.pointerMove(screen.getByTestId('row-task-a'), { clientX: 8, clientY: 8 })
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-b,task-c,task-d,task-e,task-f',
		)

		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-c,task-d,task-e,task-f')
	})

	it('Cmd+A 全选后不制造键盘 hover 行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.pointerMove(screen.getByTestId('row-task-c'), { clientX: 8, clientY: 8 })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-c')

		fireKey('a', { metaKey: true })

		expect(screen.getByTestId('selected-ids')).toHaveTextContent(
			'task-a,task-b,task-c,task-d,task-e,task-f',
		)
		expect(screen.getByTestId('focused-task')).toHaveTextContent('none')
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('none')
		expect(screen.getByTestId('hover-source')).toHaveTextContent('none')
	})

	it('Shift+Arrow 取消到空选后再次开始时先切当前行', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowDown', { shiftKey: true })
		}

		for (let index = 0; index < 6; index += 1) {
			fireKey('ArrowUp', { shiftKey: true })
		}

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')

		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
		expect(screen.getByTestId('selected-ids')).toHaveTextContent('task-a')
	})

	it('键盘扩选滚动后，静止鼠标触发的 mouseenter 不会抢走焦点', () => {
		const actions = createActions()
		renderSelectionScope({ actions })

		fireEvent.pointerMove(screen.getByTestId('row-task-b'), { clientX: 8, clientY: 8 })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-b')

		fireKey('ArrowDown', { shiftKey: true })
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-c')

		fireEvent.mouseEnter(screen.getByTestId('row-task-a'))
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-c')

		fireEvent.pointerMove(screen.getByTestId('row-task-a'), { clientX: 24, clientY: 24 })
		expect(screen.getByTestId('hovered-target')).toHaveTextContent('task-a')
	})

	it('上层菜单打开时 Arrow 和 Shift+Arrow 不触发范围选择', () => {
		const actions = createActions()
		renderSelectionScope({ actions, withBlockingLayer: true })

		fireKey('ArrowDown')
		fireKey('ArrowDown', { shiftKey: true })

		expect(screen.getByTestId('focused-task')).toHaveTextContent('none')
		expect(screen.getByTestId('selected-count')).toHaveTextContent('0')
	})

	it('向下到最后一条时保留 8px 底部留白，向上跨 section 时显示上一个 section 的 header 和最后一条 row', () => {
		const actions = createActions()
		const scrollTo = vi.fn()
		renderSelectionScope({ actions })

		const boardRoot = screen.getByTestId('scope-root')
		boardRoot.dataset.boardRoot = 'true'
		boardRoot.dataset.scrollContainer = 'true'
		boardRoot.dataset.scrollContainerRole = 'main-card'
		Object.defineProperty(boardRoot, 'scrollTop', {
			configurable: true,
			writable: true,
			value: 0,
		})
		Object.defineProperty(boardRoot, 'clientHeight', {
			configurable: true,
			value: 200,
		})
		Object.defineProperty(boardRoot, 'getBoundingClientRect', {
			configurable: true,
			value: () => makeDomRect(0, 200, 320),
		})
		Object.defineProperty(boardRoot, 'scrollTo', {
			configurable: true,
			value: scrollTo,
		})

		const rows = [
			screen.getByTestId('row-task-a'),
			screen.getByTestId('row-task-b'),
			screen.getByTestId('row-task-c'),
			screen.getByTestId('row-task-d'),
			screen.getByTestId('row-task-e'),
			screen.getByTestId('row-task-f'),
		]

		const sectionA = document.createElement('section')
		sectionA.dataset.boardSection = 'true'
		const headerA = document.createElement('div')
		headerA.dataset.boardSectionHeader = 'true'
		const sectionARows = document.createElement('div')
		sectionARows.appendChild(rows[0]!)
		sectionARows.appendChild(rows[1]!)
		sectionARows.appendChild(rows[2]!)
		sectionA.replaceChildren(headerA, sectionARows)

		const sectionB = document.createElement('section')
		sectionB.dataset.boardSection = 'true'
		const headerB = document.createElement('div')
		headerB.dataset.boardSectionHeader = 'true'
		const sectionBRows = document.createElement('div')
		sectionBRows.appendChild(rows[3]!)
		sectionBRows.appendChild(rows[4]!)
		sectionBRows.appendChild(rows[5]!)
		sectionB.replaceChildren(headerB, sectionBRows)

		boardRoot.replaceChildren(
			screen.getByTestId('hovered-target'),
			screen.getByTestId('hover-source'),
			screen.getByTestId('command-target'),
			sectionA,
			sectionB,
		)

		const topMap = new Map<HTMLElement, number>([
			[boardRoot, 0],
			[sectionA, 0],
			[headerA, 0],
			[rows[0]!, 40],
			[rows[1]!, 88],
			[rows[2]!, 136],
			[sectionB, 184],
			[headerB, 184],
			[rows[3]!, 224],
			[rows[4]!, 272],
			[rows[5]!, 320],
		])

		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
			function (this: HTMLElement) {
				const rawTop = topMap.get(this) ?? 0
				const top = this === boardRoot ? rawTop : rawTop - boardRoot.scrollTop
				const height = this === headerA || this === headerB ? 40 : this === boardRoot ? 376 : 48
				return makeDomRect(top, height, 320)
			},
		)

		fireEvent.mouseMove(rows[4]!)
		fireKey('ArrowDown')

		expect(scrollTo).toHaveBeenCalledWith({
			top: 176,
			behavior: 'auto',
		})

		scrollTo.mockClear()
		boardRoot.scrollTop = 224
		fireEvent.pointerMove(rows[3]!, { clientX: 24, clientY: 24 })
		fireKey('ArrowUp')

		expect(scrollTo).toHaveBeenCalledWith({
			top: 94,
			behavior: 'auto',
		})
	})
})

function renderScope({
	actions = createActions(),
	bulkCalls = [],
	bulkResults,
	confirmingActionIds = [],
	onBulkContext,
	selectedTaskIds = [],
	withBlockingLayer = false,
}: {
	actions?: ReturnType<typeof createActions>
	bulkCalls?: BulkActionCall[]
	bulkResults?: Partial<Record<BulkActionId, Partial<BulkActionResult>>>
	confirmingActionIds?: BulkActionId[]
	onBulkContext?: (context: ReturnType<typeof useBulkActionContext>) => void
	selectedTaskIds?: string[]
	withBlockingLayer?: boolean
} = {}) {
	const tasks = [
		createTask({ id: 'task-a', title: '任务 A' }),
		createTask({ id: 'task-b', title: '任务 B' }),
	]

	render(
		<BulkActionProvider
			actions={createTestBulkActions({
				bulkCalls,
				bulkResults,
				confirmingActionIds,
			})}
		>
			<BulkActionProbe onContext={onBulkContext} />
			{withBlockingLayer ? <div data-slot='dropdown-menu-content' /> : null}
			<input aria-label='编辑标题' />
			<TaskRowShortcutScope
				activeTaskId={null}
				onClearTaskSelection={actions.onClearTaskSelection}
				onOpenTask={actions.onOpenTask}
				onToggleTaskSelection={actions.onToggleTaskSelection}
				selectedTaskIdSet={new Set(selectedTaskIds)}
				tasks={tasks}
			>
				{(state) => (
					<div data-testid='scope-root'>
						{tasks.map((task) => (
							<div
								data-task-id={task.id}
								data-testid={`row-${task.id}`}
								key={task.id}
								onMouseEnter={() => state.onRowHover(task.id)}
								onMouseLeave={() => state.onRowHover(null)}
								onMouseMove={(event) =>
									state.onRowPointerMove(task.id, { x: event.clientX, y: event.clientY })
								}
								onPointerMove={(event) =>
									state.onRowPointerMove(task.id, { x: event.clientX, y: event.clientY })
								}
							></div>
						))}
					</div>
				)}
			</TaskRowShortcutScope>
		</BulkActionProvider>,
	)

	return actions
}

function renderSelectionScope({
	actions = createActions(),
	bulkCalls = [],
	withBlockingLayer = false,
}: {
	actions?: ReturnType<typeof createActions>
	bulkCalls?: BulkActionCall[]
	withBlockingLayer?: boolean
} = {}) {
	const tasks = [
		createTask({ id: 'task-a', title: '任务 A' }),
		createTask({ id: 'task-b', title: '任务 B' }),
		createTask({ id: 'task-c', title: '任务 C' }),
		createTask({ id: 'task-d', title: '任务 D' }),
		createTask({ id: 'task-e', title: '任务 E' }),
		createTask({ id: 'task-f', title: '任务 F' }),
	]

	function SelectionHarness() {
		const {
			selectedTaskIds,
			selectedTaskIdSet,
			selectedCount,
			focusedTaskId,
			selectTaskIds,
			setFocusedTaskId,
			moveFocus,
			toggleTaskSelection,
		} = useTaskSelection(tasks.map((task) => task.id))

		return (
			<BulkActionProvider
				actions={createTestBulkActions({
					bulkCalls,
					confirmingActionIds: [],
				})}
			>
				{withBlockingLayer ? <div data-slot='dropdown-menu-content' /> : null}
				<div data-testid='focused-task'>{focusedTaskId ?? 'none'}</div>
				<div data-testid='selected-count'>{selectedCount}</div>
				<div data-testid='selected-ids'>{selectedTaskIds.join(',')}</div>
				<TaskRowShortcutScope
					activeTaskId={null}
					focusedTaskId={focusedTaskId}
					onClearTaskSelection={actions.onClearTaskSelection}
					onMoveTaskFocus={moveFocus}
					onOpenTask={actions.onOpenTask}
					onSetFocusedTask={setFocusedTaskId}
					onSelectAllTasks={selectTaskIds}
					onToggleTaskSelection={toggleTaskSelection}
					selectedTaskIdSet={selectedTaskIdSet}
					tasks={tasks}
				>
					{(state) => (
						<div data-testid='scope-root'>
							<div data-testid='hovered-target'>{state.hoveredId ?? 'none'}</div>
							<div data-testid='hover-source'>{state.hoverSource ?? 'none'}</div>
							<div data-testid='command-target'>{state.commandTargetId ?? 'none'}</div>
							{tasks.map((task) => (
								<div
									data-task-id={task.id}
									data-testid={`row-${task.id}`}
									key={task.id}
									onMouseEnter={() => state.onRowHover(task.id)}
									onMouseLeave={() => state.onRowHover(null)}
									onMouseMove={(event) =>
										state.onRowPointerMove(task.id, { x: event.clientX, y: event.clientY })
									}
									onPointerMove={(event) =>
										state.onRowPointerMove(task.id, { x: event.clientX, y: event.clientY })
									}
								/>
							))}
						</div>
					)}
				</TaskRowShortcutScope>
			</BulkActionProvider>
		)
	}

	render(<SelectionHarness />)
	return actions
}

function BulkActionProbe({
	onContext,
}: {
	onContext?: (context: ReturnType<typeof useBulkActionContext>) => void
}) {
	const context = useBulkActionContext()
	onContext?.(context)

	return null
}

function createTestBulkActions({
	bulkCalls,
	bulkResults,
	confirmingActionIds,
}: {
	bulkCalls: BulkActionCall[]
	bulkResults?: Partial<Record<BulkActionId, Partial<BulkActionResult>>>
	confirmingActionIds: BulkActionId[]
}): BulkAction[] {
	return [
		createTestBulkAction(TASK_BULK_ACTION_IDS.completeSelected, {
			bulkCalls,
			bulkResults,
			confirmingActionIds,
		}),
		createTestBulkAction(TASK_BULK_ACTION_IDS.archiveSelected, {
			bulkCalls,
			bulkResults,
			confirmingActionIds,
		}),
		createTestBulkAction(TASK_BULK_ACTION_IDS.deleteSelected, {
			bulkCalls,
			bulkResults,
			confirmingActionIds,
		}),
	]
}

function createTestBulkAction(
	actionId: BulkActionId,
	{
		bulkCalls,
		bulkResults,
		confirmingActionIds,
	}: {
		bulkCalls: BulkActionCall[]
		bulkResults?: Partial<Record<BulkActionId, Partial<BulkActionResult>>>
		confirmingActionIds: BulkActionId[]
	},
): BulkAction {
	return {
		id: actionId,
		entity: 'task',
		label: actionId,
		intent: actionId === TASK_BULK_ACTION_IDS.completeSelected ? 'complete' : 'archive',
		requiresConfirm: confirmingActionIds.includes(actionId),
		getConfirmCopy: () => ({
			title: actionId,
			description: actionId,
			confirmLabel: '确认',
		}),
		run: async (snapshot) => {
			bulkCalls.push({ actionId, snapshot })

			return {
				status: 'success',
				actionId,
				entity: snapshot.entity,
				requestedIds: [...snapshot.ids],
				succeededIds: [...snapshot.ids],
				failedIds: [],
				skippedIds: [],
				...bulkResults?.[actionId],
			}
		},
	}
}

function createActions() {
	return {
		onToggleTaskSelection: vi.fn<(taskId: string) => void>(),
		onToggleTaskStatus: vi.fn<(task: TaskListItem) => Promise<void>>().mockResolvedValue(undefined),
		onArchiveTask: vi.fn<(task: TaskListItem) => Promise<void>>().mockResolvedValue(undefined),
		onDeleteTask: vi.fn<(task: TaskListItem) => Promise<void>>().mockResolvedValue(undefined),
		onClearTaskSelection: vi.fn<() => void>(),
		onOpenTask: vi.fn<(taskId: string) => void>(),
	}
}

function createTask(overrides: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		inboxAt: '2026-05-15T00:00:00Z',
		title: '任务 A',
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-15T00:00:00Z',
		priority: 2,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
		...overrides,
	}
}

function fireKey(
	key: string,
	options: Pick<KeyboardEventInit, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> & {
		target?: EventTarget
	} = {},
) {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		metaKey: options.metaKey,
		ctrlKey: options.ctrlKey,
		altKey: options.altKey,
		shiftKey: options.shiftKey,
	})

	Object.defineProperty(event, 'target', {
		configurable: true,
		value: options.target ?? document.body,
	})

	act(() => {
		window.dispatchEvent(event)
	})

	return event
}

function flushShortcutTimers() {
	act(() => {
		vi.runAllTimers()
	})
}

async function flushShortcutAsyncWork() {
	flushShortcutTimers()
	await act(async () => {
		await Promise.resolve()
	})
}

function makeDomRect(top: number, height: number, width: number): DOMRect {
	return {
		x: 0,
		y: top,
		top,
		bottom: top + height,
		left: 0,
		right: width,
		width,
		height,
		toJSON: () => ({}),
	} as DOMRect
}
