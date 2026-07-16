import { useMemo, useRef } from 'react'

import { openStartupFallback } from '@/app/navigation/intents'
import type { ShellLayoutProps } from '@/app/layouts/shell/shellLayoutTypes'
import { useShellSessionRouteHistory } from '@/app/navigation/sessionRouteHistory'
import { useShellChromeData } from '@/app/layouts/shell/model/useShellChromeData'
import { useShellCreateDialogState } from '@/app/layouts/shell/model/useShellCreateDialogState'
import { useShellCommandSystem } from '@/app/layouts/shell/model/useShellCommandSystem'
import { ShellChrome } from '@/app/layouts/shell/ShellChrome'
import { ShellLayoutSkeleton } from '@/app/layouts/shell/ShellLayoutSkeleton'
import { ShellOverlays } from '@/app/layouts/shell/overlays/ShellOverlays'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import { SyncStatusProvider } from '@/features/sync/model/SyncStatusProvider'
import { useUpdateEvents } from '@/features/update'

/**
 * 壳主体：组合数据 hooks → Chrome + Overlays。
 *
 * 结构：
 * - useShellChromeData：侧栏/spaces
 * - useShellCreateDialogState：创建弹窗
 * - useShellCommandSystem：命令宿主
 * - ShellChrome / ShellOverlays：UI
 */
export function ShellLayoutContent({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: ShellLayoutProps) {
	useUpdateEvents()

	const isSettingsMode = shellRoute.isSettingsPath
	/** 进入设置前的工作路径，供 SettingsSidebar「返回应用」 */
	const settingsReturnPathRef = useRef(openStartupFallback(currentScope))
	if (!isSettingsMode) {
		settingsReturnPathRef.current = shellRoute.pathname || openStartupFallback(currentScope)
	}

	const chrome = useShellChromeData(currentScope)

	const createDialog = useShellCreateDialogState({
		currentScope,
		spaces: chrome.spaces,
		projectOptions: chrome.projectOptions,
		sidebarProjectsLoading: chrome.sidebarProjects.status === 'loading',
	})

	const routeProjectId = shellRoute.kind === 'project' ? shellRoute.projectId : null
	const isNoProjectPage = shellRoute.section === 'noProject'

	/** 按当前页预填「新建任务」草稿（项目页 / 无项目页） */
	const handleOpenTaskCreate = useMemo(() => {
		const open = createDialog.openTaskCreateDialog
		if (routeProjectId) {
			return () => open({ projectId: routeProjectId }, 'default')
		}
		if (isNoProjectPage) {
			return () => open({ placement: 'noProject' }, 'default')
		}
		return () => open(undefined, 'default')
	}, [createDialog.openTaskCreateDialog, isNoProjectPage, routeProjectId])

	const routeHistory = useShellSessionRouteHistory({
		currentScope,
		currentSpaceId,
		currentRoute: shellRoute,
		spaces: chrome.spaces,
		projects: chrome.sidebarProjectLinks,
	})

	const command = useShellCommandSystem({
		currentScope,
		currentSpaceId,
		activeSection,
		shellRoute,
		handleOpenTaskCreate,
		openTaskCreateDialog: createDialog.openTaskCreateDialog,
		openProjectCreateDialog: createDialog.openProjectCreateDialog,
		closeTaskCreateDialog: createDialog.closeTaskCreateDialog,
		closeProjectCreateDialog: createDialog.closeProjectCreateDialog,
		goBack: routeHistory.goBack,
		goForward: routeHistory.goForward,
		canGoBack: routeHistory.canGoBack,
	})

	if (!chrome.isChromeReady || !chrome.sidebarSettings) {
		return (
			<ShellLayoutSkeleton
				message={chrome.sidebarSettingsError ?? chrome.spaceError}
				status={chrome.sidebarSettings ? chrome.spaceStatus : chrome.sidebarSettingsStatus}
			/>
		)
	}

	const currentSpaceLabel =
		currentScope.type === 'all'
			? '全部 Spaces'
			: (chrome.spaces.find((space) => space.id === currentSpaceId)?.name ??
				currentSpaceId ??
				'未选择 Space')

	/** 命令板已缓存全量项目则优先；否则回退侧栏列表 */
	const headerProjects =
		command.commandProjects.length > 0 ? command.commandProjects : chrome.sidebarProjectLinks

	return (
		<SidebarProvider
			className='sf-shell-layout relative flex h-full min-h-0 flex-col overflow-hidden bg-background'
			desktopPreference={chrome.sidebarSettings.desktopPreference}
			onDesktopPreferenceChange={(next) => {
				void chrome.setDesktopPreference(next)
			}}
			onSidebarWidthCommit={(width) => {
				void chrome.setSidebarWidth(width)
			}}
			sidebarWidth={chrome.sidebarSettings.width}
		>
			<SyncStatusProvider>
				<ShellChrome
					activeSection={activeSection}
					chrome={chrome}
					command={command}
					createDialog={createDialog}
					currentScope={currentScope}
					currentSpaceId={currentSpaceId}
					currentSpaceLabel={currentSpaceLabel}
					handleOpenTaskCreate={handleOpenTaskCreate}
					headerProjects={headerProjects}
					isSettingsMode={isSettingsMode}
					routeHistory={routeHistory}
					settingsReturnPathRef={settingsReturnPathRef}
					shellRoute={shellRoute}
				>
					{children}
				</ShellChrome>
				<ShellOverlays
					closeCustomDateDialog={createDialog.closeCustomDateDialog}
					closeProjectCreateDialog={createDialog.closeProjectCreateDialog}
					closeTaskCreateDialog={createDialog.closeTaskCreateDialog}
					createDialogType={createDialog.createDialogType}
					currentScope={currentScope}
					customDateDialog={createDialog.customDateDialog}
					defaultCreateSpaceId={createDialog.defaultCreateSpaceId}
					projectOptions={chrome.projectOptions}
					projectsLoading={chrome.sidebarProjects.status === 'loading'}
					selectedSpaceId={createDialog.selectedSpaceId}
					setSelectedSpaceId={createDialog.setSelectedSpaceId}
					shouldDelayTaskCreateDialog={createDialog.shouldDelayTaskCreateDialog}
					spaces={chrome.spaces}
					taskCreateDraft={createDialog.taskCreateDraft}
					taskCreatePresentation={createDialog.taskCreatePresentation}
					toggleTaskCreatePresentation={createDialog.toggleTaskCreatePresentation}
				/>
			</SyncStatusProvider>
		</SidebarProvider>
	)
}
