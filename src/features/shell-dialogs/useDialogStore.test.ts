import { useDialogStore } from '@/features/shell-dialogs'

describe('useDialogStore', () => {
	beforeEach(() => {
		useDialogStore.setState({
			isCommandOpen: false,
			isShortcutHelpOpen: false,
			createDialogType: null,
			taskCreateDraft: {
				projectId: null,
				status: 'todo',
				placement: undefined,
			},
			taskCreatePresentation: 'default',
		})
	})

	it('c 打开默认 task create，v 打开 fullscreen task create', () => {
		useDialogStore.getState().openTaskCreateDialog()

		expect(useDialogStore.getState().createDialogType).toBe('task')
		expect(useDialogStore.getState().taskCreatePresentation).toBe('default')

		useDialogStore.getState().closeTaskCreateDialog()
		useDialogStore.getState().openTaskCreateDialog(undefined, 'fullscreen')

		expect(useDialogStore.getState().createDialogType).toBe('task')
		expect(useDialogStore.getState().taskCreatePresentation).toBe('fullscreen')
	})

	it('最大化按钮切换 default 和 fullscreen', () => {
		useDialogStore.getState().openTaskCreateDialog()
		useDialogStore.getState().toggleTaskCreatePresentation()

		expect(useDialogStore.getState().taskCreatePresentation).toBe('fullscreen')

		useDialogStore.getState().toggleTaskCreatePresentation()

		expect(useDialogStore.getState().taskCreatePresentation).toBe('default')
	})

	it('关闭后再次以 c 打开仍回到默认态', () => {
		useDialogStore.getState().openTaskCreateDialog(undefined, 'fullscreen')
		useDialogStore.getState().closeTaskCreateDialog()
		useDialogStore.getState().openTaskCreateDialog()

		expect(useDialogStore.getState().taskCreatePresentation).toBe('default')
	})

	it('关闭后再次以 v 打开仍回到 fullscreen 态', () => {
		useDialogStore.getState().openTaskCreateDialog()
		useDialogStore.getState().closeTaskCreateDialog()
		useDialogStore.getState().openTaskCreateDialog(undefined, 'fullscreen')

		expect(useDialogStore.getState().taskCreatePresentation).toBe('fullscreen')
	})

	it('project create 始终回落为默认态', () => {
		useDialogStore.getState().openTaskCreateDialog(undefined, 'fullscreen')
		useDialogStore.getState().openProjectCreateDialog()

		expect(useDialogStore.getState().createDialogType).toBe('project')
		expect(useDialogStore.getState().taskCreatePresentation).toBe('default')
	})

	it('快捷键帮助和命令菜单互斥，并支持 toggle', () => {
		useDialogStore.getState().openCommand()
		useDialogStore.getState().openShortcutHelp()

		expect(useDialogStore.getState().isCommandOpen).toBe(false)
		expect(useDialogStore.getState().isShortcutHelpOpen).toBe(true)

		useDialogStore.getState().toggleShortcutHelp()
		expect(useDialogStore.getState().isShortcutHelpOpen).toBe(false)

		useDialogStore.getState().toggleShortcutHelp()
		expect(useDialogStore.getState().isShortcutHelpOpen).toBe(true)
	})
})
