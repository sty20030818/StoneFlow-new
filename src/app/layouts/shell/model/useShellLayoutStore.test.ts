import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'

describe('useShellLayoutStore', () => {
	afterEach(() => {
		useShellLayoutStore.setState({
			currentSpaceId: 'work',
			activeSection: 'inbox',
			isCommandOpen: false,
			isTaskCreateOpen: false,
			taskCreateProjectId: null,
			taskCreateStatus: 'todo',
			isProjectCreateOpen: false,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
			projectTaskBoardOpenSections: ['todo', 'done'],
		})
	})

	it('保持 command、create modal 与 drawer 互斥', () => {
		useShellLayoutStore.getState().openCommand()
		expect(useShellLayoutStore.getState()).toMatchObject({
			isCommandOpen: true,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			isDrawerOpen: false,
		})

		useShellLayoutStore.getState().openProjectCreateDialog()
		expect(useShellLayoutStore.getState()).toMatchObject({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: true,
			isDrawerOpen: false,
		})

		useShellLayoutStore.getState().openDrawer('task', 'task-1')
		expect(useShellLayoutStore.getState()).toMatchObject({
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			isDrawerOpen: true,
			activeDrawerKind: 'task',
			activeDrawerId: 'task-1',
		})
	})

	it('分别维护任务与项目刷新版本', () => {
		useShellLayoutStore.getState().bumpTaskDataVersion()
		useShellLayoutStore.getState().bumpProjectDataVersion()

		expect(useShellLayoutStore.getState()).toMatchObject({
			taskDataVersion: 1,
			projectDataVersion: 1,
		})
	})

	it('打开任务创建弹窗时记录默认 project 与 status', () => {
		useShellLayoutStore.getState().openTaskCreateDialog({
			projectId: 'project-1',
			status: 'done',
		})

		expect(useShellLayoutStore.getState()).toMatchObject({
			isTaskCreateOpen: true,
			taskCreateProjectId: 'project-1',
			taskCreateStatus: 'done',
		})
	})
})
