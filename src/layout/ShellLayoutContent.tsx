import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import type { AppLayoutProps } from '@/layout/appLayoutTypes'
import { useShellSessionRouteHistory } from '@/app/navigation'
import { useShellChromeData } from '@/layout/model/useShellChromeData'
import { useShellCreateDialogState } from '@/layout/model/useShellCreateDialogState'
import { useShellCommandSystem } from '@/layout/model/useShellCommandSystem'
import { useSettingsReturnPath } from '@/layout/model/useSettingsReturnPath'
import { ShellChrome } from '@/layout/ShellChrome'
import { ShellLayoutSkeleton } from '@/layout/ShellLayoutSkeleton'
import { ShellOverlays } from '@/layout/overlays/ShellOverlays'
import { SidebarProvider } from '@/shared/components/base/sidebar'
import { SyncStatusProvider } from '@/features/sync'
import { useUpdateEvents } from '@/features/update'
import { dismissBootShell } from '@/shared/lib/bootShell'
import { notifyMainSurfaceReady } from '@/app/lifecycle/mainSurface'

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
}: AppLayoutProps) {
	const [changelogIntent, setChangelogIntent] = useState<{ open: boolean; version: string | null }>(
		{
			open: false,
			version: null,
		},
	)
	const [isAboutOpen, setIsAboutOpen] = useState(false)
	const openChangelog = useCallback((version: string | null = null) => {
		setChangelogIntent({ open: true, version })
	}, [])
	useUpdateEvents(openChangelog)

	const isSettingsMode = shellRoute.isSettingsPath
	/** 进入设置前的工作路径（边沿捕获）；供「返回应用」与 Esc 关层 */
	const settingsReturnPath = useSettingsReturnPath(shellRoute, currentScope)

	const chrome = useShellChromeData(currentScope)

	const createDialog = useShellCreateDialogState({
		currentScope,
		spaces: chrome.spaces,
		projectOptions: chrome.projectOptions,
		sidebarProjectsLoading: chrome.sidebarProjects.status === 'loading',
	})

	const routeProjectId = shellRoute.kind === 'project' ? shellRoute.projectId : null
	const isStandalonePage = shellRoute.section === 'standalone'

	/** 按当前页预填「新建任务」草稿（项目页 / 无项目页） */
	const handleOpenTaskCreate = useMemo(() => {
		const open = createDialog.openTaskCreateDialog
		if (routeProjectId) {
			return () => open({ projectId: routeProjectId }, 'default')
		}
		if (isStandalonePage) {
			return () => open({ placement: 'standalone' }, 'default')
		}
		return () => open(undefined, 'default')
	}, [createDialog.openTaskCreateDialog, isStandalonePage, routeProjectId])

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
		isSettingsMode,
		settingsReturnPath,
	})

	if (!chrome.isChromeReady || !chrome.sidebarSettings) {
		const sidebarSettings = chrome.sidebarSettings
		return (
			<ShellLayoutSkeleton
				desktopPreference={sidebarSettings?.desktopPreference}
				message={chrome.sidebarSettingsError ?? chrome.spaceError}
				sidebarWidth={sidebarSettings?.width}
				status={sidebarSettings ? chrome.spaceStatus : chrome.sidebarSettingsStatus}
			/>
		)
	}

	const currentSpaceLabel =
		currentScope.type === 'all'
			? '所有空间'
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
			<BootShellDismiss />
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
					onOpenChangelog={() => openChangelog()}
					onOpenAbout={() => setIsAboutOpen(true)}
					headerProjects={headerProjects}
					isSettingsMode={isSettingsMode}
					routeHistory={routeHistory}
					settingsReturnPath={settingsReturnPath}
					shellRoute={shellRoute}
				>
					{children}
				</ShellChrome>
				<ShellOverlays
					closeCustomDateDialog={createDialog.closeCustomDateDialog}
					closeProjectCreateDialog={createDialog.closeProjectCreateDialog}
					closeTaskCreateDialog={createDialog.closeTaskCreateDialog}
					changelogOpen={changelogIntent.open}
					changelogVersion={changelogIntent.version}
					aboutOpen={isAboutOpen}
					createDialogType={createDialog.createDialogType}
					currentScope={currentScope}
					customDateDialog={createDialog.customDateDialog}
					defaultCreateSpaceId={createDialog.defaultCreateSpaceId}
					projectOptions={chrome.projectOptions}
					projectsLoading={chrome.sidebarProjects.status === 'loading'}
					onChangelogOpenChange={(open) => setChangelogIntent((current) => ({ ...current, open }))}
					onAboutOpenChange={setIsAboutOpen}
					onOpenChangelogFromAbout={() => {
						setIsAboutOpen(false)
						openChangelog()
					}}
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

/** 真壳路径兜底：跳过骨架直接进壳时也要撤 HTML 遮罩 */
function BootShellDismiss() {
	useLayoutEffect(() => {
		dismissBootShell()
	}, [])

	useEffect(() => {
		void notifyMainSurfaceReady().catch((error) => {
			console.warn('[app] launcher warmup request failed:', error)
		})
	}, [])

	return null
}
