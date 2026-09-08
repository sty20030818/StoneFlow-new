import { useDialogStore } from '@/features/shell-dialogs'

describe('useDialogStore', () => {
	beforeEach(() => {
		useDialogStore.setState(useDialogStore.getInitialState())
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

	it('自定义日期叠加在创建窗口上，取消后保留创建入口与放大状态', () => {
		const draft = { projectId: 'project-travel', status: 'doing' as const }
		const onSubmit = vi.fn()
		useDialogStore.getState().openTaskCreateDialog(draft, 'fullscreen')
		useDialogStore.getState().openCustomDateDialog({
			label: '截止时间',
			value: null,
			hasExistingValue: false,
			onSubmit,
		})

		expect(useDialogStore.getState()).toMatchObject({
			createDialogType: 'task',
			taskCreateDraft: draft,
			taskCreatePresentation: 'fullscreen',
			customDateDialog: { onSubmit },
		})
		useDialogStore.getState().closeCustomDateDialog()
		expect(useDialogStore.getState()).toMatchObject({
			createDialogType: 'task',
			taskCreateDraft: draft,
			taskCreatePresentation: 'fullscreen',
			customDateDialog: null,
		})
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it.each(['task', 'project'] as const)('关闭 %s 创建时同时清除其上层日期窗口', (kind) => {
		const state = useDialogStore.getState()
		if (kind === 'task') state.openTaskCreateDialog()
		else state.openProjectCreateDialog()
		state.openCustomDateDialog({
			label: '截止时间',
			value: null,
			hasExistingValue: false,
			onSubmit: vi.fn(),
		})

		if (kind === 'task') state.closeTaskCreateDialog()
		else state.closeProjectCreateDialog()

		expect(useDialogStore.getState().createDialogType).toBeNull()
		expect(useDialogStore.getState().customDateDialog).toBeNull()
	})

	it.each(['openCommand', 'openShortcutHelp'] as const)(
		'%s 仍替换创建及其上层日期窗口',
		(openOverlay) => {
			const state = useDialogStore.getState()
			state.openTaskCreateDialog()
			state.openCustomDateDialog({
				label: '截止时间',
				value: null,
				hasExistingValue: false,
				onSubmit: null,
			})
			state[openOverlay]()

			expect(useDialogStore.getState().createDialogType).toBeNull()
			expect(useDialogStore.getState().customDateDialog).toBeNull()
		},
	)
})
