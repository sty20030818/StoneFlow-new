import { act, fireEvent, render, screen } from '@testing-library/react'
import { Modal } from '@heroui/react'

import {
	CommandShortcutLayer,
	createEmptyCommandContext,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'
import { registerShellChromeCommands } from '@/layout/command-bridge/registerShellChromeCommands'

const shortcutRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('Shell Escape priority', () => {
	it('Menu、Dialog、Sheet 已消费的 Escape 不进入 Shell 关层命令', () => {
		vi.useFakeTimers()
		const onTrigger = vi.fn()
		render(
			<ShortcutRegistryProvider registry={shortcutRegistry}>
				<CommandShortcutLayer onTrigger={onTrigger} />
				<Modal.Backdrop isOpen>
					<Modal.Container>
						<Modal.Dialog aria-label='最高层 Overlay'>最高层 Overlay</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</ShortcutRegistryProvider>,
		)

		fireEvent.keyDown(screen.getByRole('dialog', { name: '最高层 Overlay' }), { key: 'Escape' })
		act(() => vi.runAllTimers())

		expect(onTrigger).not.toHaveBeenCalled()
		vi.useRealTimers()
	})

	it.each([
		['Detail Aside', { detail: true, preview: true, selection: true }, [1, 0, 0, 0]],
		['Peek', { detail: false, preview: true, selection: true }, [0, 1, 0, 0]],
		['Selection', { detail: false, preview: false, selection: true }, [0, 0, 1, 0]],
		['页面', { detail: false, preview: false, selection: false }, [0, 0, 0, 1]],
	] as const)('%s 只消费当前最高层', (_label, state, expectedCalls) => {
		const harness = createCloseHarness(state)

		harness.closeCurrentLayer(harness.context)

		expect([
			harness.closeEntityDrawer.mock.calls.length,
			harness.closePreview.mock.calls.length,
			harness.clearSelection.mock.calls.length,
			harness.goBack.mock.calls.length,
		]).toEqual(expectedCalls)
	})

	it('任务创建表单延迟挂载时，Escape 仍关闭创建意图且不穿透到底层', () => {
		const harness = createCloseHarness({ detail: true, preview: true, selection: true })
		useDialogStore.getState().openTaskCreateDialog({ projectId: 'project-loading' })

		harness.closeCurrentLayer(harness.context)

		expect(useDialogStore.getState().createDialogType).toBeNull()
		expect([
			harness.closeEntityDrawer.mock.calls.length,
			harness.closePreview.mock.calls.length,
			harness.clearSelection.mock.calls.length,
			harness.goBack.mock.calls.length,
		]).toEqual([0, 0, 0, 0])
	})
})

function createCloseHarness({
	detail,
	preview,
	selection,
}: {
	detail: boolean
	preview: boolean
	selection: boolean
}) {
	const closeEntityDrawer = vi.fn()
	const closePreview = vi.fn()
	const clearSelection = vi.fn()
	const goBack = vi.fn()
	const host = {
		activeDetail: detail ? { kind: 'task', id: 'task-a' } : null,
		canGoBack: true,
		closeEntityDrawer,
		goBack,
		isSettingsMode: false,
		taskPreviewController: {
			closePreview,
			previewState: { open: preview },
		},
	} as unknown as Parameters<typeof registerShellChromeCommands>[0]
	const context = createEmptyCommandContext()
	context.selection = {
		...context.selection,
		clearSelection,
		hasSelection: selection,
		ids: selection ? ['task-a'] : [],
	}
	const closeCurrentLayer = registerShellChromeCommands(host).closeCurrentLayer
	if (!closeCurrentLayer) throw new Error('closeCurrentLayer 未注册')

	return {
		clearSelection,
		closeCurrentLayer,
		closeEntityDrawer,
		closePreview,
		context,
		goBack,
	}
}
