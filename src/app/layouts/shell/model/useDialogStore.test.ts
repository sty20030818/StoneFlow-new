import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'

describe('useDialogStore', () => {
	beforeEach(() => {
		useDialogStore.setState({
			isCommandOpen: false,
			createDialogType: null,
			taskCreateDraft: {
				projectId: null,
				status: 'todo',
				placement: undefined,
			},
			taskCreatePresentation: 'default',
		})
		useDrawerStore.setState({
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
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
})
