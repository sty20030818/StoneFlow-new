import { useMemo, useRef } from 'react'

import { openStartupFallback } from '@/app/navigation/intents'
import type { ShellLayoutProps } from '@/app/layouts/shell/shellLayoutTypes'
import { useShellSessionRouteHistory } from '@/app/navigation/sessionRouteHistory'
import { useShellChromeData } from '@/app/layouts/shell/model/useShellChromeData'
import { useShellCreateDialogState } from '@/app/layouts/shell/model/useShellCreateDialogState'
import { useShellCommandSystem } from '@/app/layouts/shell/model/useShellCommandSystem'
import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { SettingsSidebar } from '@/app/layouts/shell/SettingsSidebar'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { ShellLayoutSkeleton } from '@/app/layouts/shell/ShellLayoutSkeleton'
import { ShellOverlays } from '@/app/layouts/shell/overlays/ShellOverlays'
import { DEFAULT_SETTINGS_SECTION } from '@/features/settings/model/settingsSection'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import { SyncStatusProvider } from '@/features/sync/model/SyncStatusProvider'
import { useUpdateEvents } from '@/features/update'
import { CommandShortcutLayer } from '@/features/command'

/**
 * 壳主体编排：组合 Chrome 数据、创建弹窗态、命令宿主，再渲染 Header/Sidebar/Main/Overlays。
 *
 * 变量为何多？
 * - 多数是 **订阅切片**（dialog store selectors、sidebar settings actions），不是重复真相。
 * - 命令协议要求多个上下文袋（route/ui/focus/view/submit），字段由 command feature 定义。
 * - 真正可删的冗余见文件底部注释表（已去掉 commandProjectLinks 恒等映射等）。
 */
export function ShellLayoutContent({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: ShellLayoutProps) {
	// 应用更新事件监听（副作用，无返回值）
	useUpdateEvents()

	const isSettingsMode = shellRoute.isSettingsPath
	/** 进入设置前的工作路径，供 SettingsSidebar「返回应用」 */
	const settingsReturnPathRef = useRef(openStartupFallback(currentScope))
	if (!isSettingsMode) {
		settingsReturnPathRef.current = shellRoute.pathname || openStartupFallback(currentScope)
	}

	// --- Chrome 数据：spaces / 侧栏 / badge / space mutations ---
	const chrome = useShellChromeData(currentScope)

	// --- 创建弹窗：draft、Space 选择、延迟打开 ---
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

	// 会话前进后退（依赖侧栏项目链接做标题解析）
	const {
		entries: routeHistoryEntries,
		canGoBack,
		canGoForward,
		goBack,
		goForward,
		navigateToHistoryEntry,
	} = useShellSessionRouteHistory({
		currentScope,
		currentSpaceId,
		currentRoute: shellRoute,
		spaces: chrome.spaces,
		projects: chrome.sidebarProjectLinks,
	})

	// --- 命令宿主（Context + Runtime + Header 回调）---
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
		goBack,
		goForward,
		canGoBack,
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

	/** 命令板已缓存全量项目则优先用；否则回退侧栏列表 */
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
				<CommandShortcutLayer
					bindings={command.activeShortcutBindings}
					onChordStateChange={command.setChordSession}
					onTrigger={command.runCommand}
					shouldTrigger={command.shouldTriggerCommandShortcut}
				/>
				<ShellHeader
					activeSection={activeSection}
					canGoBack={canGoBack}
					canGoForward={canGoForward}
					chordSession={command.chordSession}
					commandContext={command.commandContext}
					commandMenuFilterKind={command.commandMenuFilterKind}
					commandMenuMode={command.commandMenuMode}
					commandRuntime={command.commandRuntime}
					currentScope={currentScope}
					currentSpaceId={currentSpaceId}
					isCommandOpen={command.isCommandOpen}
					isShortcutHelpOpen={command.isShortcutHelpOpen}
					onApplyFilter={(input) => {
						command.pageFilter.actions.applyFilter(input)
					}}
					onClearAllFilters={() => {
						command.pageFilter.actions.clearAll()
					}}
					onCloseDrawer={command.closeEntityDrawer}
					onCommandOpenChange={command.setCommandOpen}
					onNavigateToHistoryEntry={navigateToHistoryEntry}
					onOpenTaskPage={(task) => {
						command.openTaskPage({ taskId: task.id, spaceId: task.spaceId })
					}}
					onRunCommand={command.runCommand}
					onSelectFilterKind={(kind) => {
						command.pageFilter.actions.openFilterPicker(kind)
						command.setCommandMenuFilterKind(kind)
					}}
					onSelectTaskDate={command.onSelectTaskDate}
					onSelectTaskPlacement={command.onSelectTaskPlacement}
					onSelectTaskPriority={command.onSelectTaskPriority}
					onSelectTaskStatus={command.onSelectTaskStatus}
					onShortcutHelpOpenChange={command.setShortcutHelpOpen}
					onToggleCompletedFilter={() => {
						command.pageFilter.actions.toggleCompleted()
					}}
					projects={headerProjects}
					routeHistoryEntries={routeHistoryEntries}
					spaces={chrome.spaces}
				/>
				<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-sf-shell'>
					<div className='flex min-h-0 w-(--sf-shell-sidebar-reserved-width) shrink-0 flex-col overflow-hidden transition-[width] duration-(--sf-shell-layout-sync-duration) ease-(--sf-shell-layout-sync-easing) motion-reduce:transition-none group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none'>
						{isSettingsMode ? (
							<SettingsSidebar
								activeSettingsSection={shellRoute.settingsSection ?? DEFAULT_SETTINGS_SECTION}
								currentScope={currentScope}
								currentSpaceId={currentSpaceId}
								returnPath={settingsReturnPathRef.current}
							/>
						) : (
							<ShellSidebar
								currentScope={currentScope}
								currentSpaceId={currentSpaceId}
								navBadges={chrome.navBadges}
								onArchiveSpace={(spaceId) => chrome.archiveSpace.mutateAsync(spaceId)}
								onCreateSpace={(input) => chrome.createSpace.mutateAsync(input)}
								onDeleteSpace={(spaceId) => chrome.deleteSpace.mutateAsync(spaceId)}
								onOpenProjectCreateDialog={createDialog.openProjectCreateDialog}
								onResetMainItemsVisibility={() => {
									void chrome.resetSidebarMainItemsVisibility()
								}}
								onSetDefaultSpace={(spaceId) => chrome.setDefaultSpace.mutateAsync(spaceId)}
								onUpdateItemVisibility={(target, visible) => {
									void chrome.setSidebarItemVisibility(target, visible)
								}}
								onUpdateSpace={(input) => chrome.updateSpace.mutateAsync(input)}
								projects={chrome.sidebarProjectLinks}
								settings={chrome.sidebarSettings}
								spaces={chrome.spaces}
							/>
						)}
					</div>

					<div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sf-shell'>
						<ShellMain
							activeDetail={command.activeDetail}
							currentSpaceLabel={currentSpaceLabel}
							isDrawerOpen={command.isDrawerOpen}
							onCloseDrawer={command.closeEntityDrawer}
							onOpenProjectCreateDialog={() => createDialog.openProjectCreateDialog()}
							onOpenTaskCreateDialog={handleOpenTaskCreate}
							showPreview
						>
							{children}
						</ShellMain>
					</div>
				</div>
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
				<ShellFooter />
			</SyncStatusProvider>
		</SidebarProvider>
	)
}
