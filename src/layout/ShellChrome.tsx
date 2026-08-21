import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Sheet, Sidebar } from '@heroui-pro/react'

import type { Scope } from '@/shared/types'
import type { ShellRoute } from '@/app/navigation'
import type { ShellSectionKey } from '@/layout/types'
import { ShellHeader } from '@/layout/ShellHeader'
import { ShellMain } from '@/layout/ShellMain'
import { SettingsSidebar } from '@/features/settings'
import { ShellSidebar } from '@/layout/ShellSidebar'
import { ShellFooter } from '@/layout/ShellFooter'
import { SidebarResizeRail } from '@/layout/sidebar/SidebarResizeRail'
import { DEFAULT_SETTINGS_SECTION } from '@/features/settings'
import { CommandShortcutLayer, type CommandId } from '@/features/command'
import type { useShellCommandSystem } from '@/layout/model/useShellCommandSystem'
import type { useShellChromeData } from '@/layout/model/useShellChromeData'
import type { useShellCreateDialogState } from '@/layout/model/useShellCreateDialogState'
import type { useShellSessionRouteHistory } from '@/app/navigation'
import type { ShellSidebarController } from '@/layout/model/useShellSidebarController'

type CommandHost = ReturnType<typeof useShellCommandSystem>
type ChromeData = ReturnType<typeof useShellChromeData>
type CreateDialog = ReturnType<typeof useShellCreateDialogState>
type RouteHistory = ReturnType<typeof useShellSessionRouteHistory>

type ShellChromeProps = {
	children: ReactNode
	/** 当前是否在设置路径 */
	isSettingsMode: boolean
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	shellRoute: ShellRoute
	/** 进入设置前捕获的工作路径，供「返回应用」 */
	settingsReturnPath: string
	/** Header 项目列表（命令板缓存或侧栏） */
	headerProjects: CommandHost['commandProjects'] | ChromeData['sidebarProjectLinks']
	chrome: ChromeData
	command: CommandHost
	createDialog: CreateDialog
	routeHistory: RouteHistory
	handleOpenTaskCreate: () => void
	onOpenChangelog: () => void
	onOpenAbout: () => void
	sidebar: ShellSidebarController
}

/**
 * 壳可视 Chrome：ShortcutLayer + Header + Sidebar/Settings + Main + Footer。
 * 不含 Overlays（创建弹窗等）。
 */
export function ShellChrome({
	children,
	isSettingsMode,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
	settingsReturnPath,
	headerProjects,
	chrome,
	command,
	createDialog,
	routeHistory,
	handleOpenTaskCreate,
	onOpenChangelog,
	onOpenAbout,
	sidebar,
}: ShellChromeProps) {
	const sidebarNavigation = isSettingsMode ? (
		<SettingsSidebar
			activeSettingsSection={shellRoute.settingsSection ?? DEFAULT_SETTINGS_SECTION}
			currentScope={currentScope}
			currentSpaceId={currentSpaceId}
			returnPath={settingsReturnPath}
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
			settings={chrome.sidebarSettings!}
			spaces={chrome.spaces}
		/>
	)
	const runShellCommand = (commandId: CommandId) => {
		void command.runCommand(commandId, { source: 'global-shortcut' })
	}
	const { isCompact: isSidebarCompact, mobileSheetOpen, setMobileSheetOpen } = sidebar

	useEffect(() => {
		if (isSidebarCompact && command.isDrawerOpen && mobileSheetOpen) {
			setMobileSheetOpen(false)
		}
	}, [command.isDrawerOpen, isSidebarCompact, mobileSheetOpen, setMobileSheetOpen])

	return (
		<>
			<CommandShortcutLayer
				onChordStateChange={command.setChordSession}
				onTrigger={runShellCommand}
				shouldTrigger={command.shouldTriggerCommandShortcut}
			/>
			<ShellHeader
				activeSection={activeSection}
				canGoBack={routeHistory.canGoBack}
				canGoForward={routeHistory.canGoForward}
				chordSession={command.chordSession}
				commandContext={command.commandContext}
				commandMenuMode={command.commandMenuMode}
				commandRuntime={command.commandRuntime}
				currentScope={currentScope}
				currentSpaceId={currentSpaceId}
				isCommandOpen={command.isCommandOpen}
				isShortcutHelpOpen={command.isShortcutHelpOpen}
				onCloseDrawer={command.closeEntityDrawer}
				onCommandOpenChange={command.setCommandOpen}
				onNavigateToHistoryEntry={routeHistory.navigateToHistoryEntry}
				onOpenAbout={onOpenAbout}
				onOpenChangelog={onOpenChangelog}
				onOpenTaskPage={(task) => {
					command.openTaskPage({ taskId: task.id, spaceId: task.spaceId })
				}}
				onRunCommand={runShellCommand}
				onSelectTaskDate={command.onSelectTaskDate}
				onSelectTaskPlacement={command.onSelectTaskPlacement}
				onSelectTaskPriority={command.onSelectTaskPriority}
				onSelectTaskStatus={command.onSelectTaskStatus}
				onShortcutHelpOpenChange={command.setShortcutHelpOpen}
				projects={headerProjects}
				routeHistoryEntries={routeHistory.entries}
				spaces={chrome.spaces}
				sidebar={sidebar}
			/>
			<div
				className={`relative grid min-h-0 min-w-0 flex-1 overflow-hidden bg-surface-secondary ${
					sidebar.isCompact ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[auto_minmax(0,1fr)]'
				}`}
				data-resizing={sidebar.isResizing ? 'true' : undefined}
				data-sidebar-mode={sidebar.mode}
				data-slot='shell-workspace'
			>
				{sidebar.isCompact ? null : (
					<div className='relative flex min-h-0 min-w-0 flex-col overflow-visible'>
						{sidebarNavigation}
						<SidebarResizeRail controller={sidebar} />
					</div>
				)}

				<div
					className={`flex min-h-0 min-w-0 overflow-hidden ${sidebar.isCompact ? '' : 'pe-2'}`}
					data-slot='shell-main-region'
				>
					<Sidebar.Main className='min-h-0 overflow-hidden' style={{ margin: 0 }}>
						<ShellMain
							activeDetail={command.activeDetail}
							isCompact={sidebar.isCompact}
							isDrawerOpen={command.isDrawerOpen}
							onCloseDrawer={command.closeEntityDrawer}
							onOpenProjectCreateDialog={() => createDialog.openProjectCreateDialog()}
							onOpenTaskCreateDialog={handleOpenTaskCreate}
							showPreview
						>
							{children}
						</ShellMain>
					</Sidebar.Main>
				</div>
			</div>
			{sidebar.isCompact ? (
				<Sheet
					isDismissable
					isModal
					isOpen={sidebar.mobileSheetOpen && !command.isDrawerOpen}
					onOpenChange={sidebar.setMobileSheetOpen}
					placement='left'
					shouldAutoFocus
				>
					<Sheet.Backdrop variant='opaque'>
						<Sheet.Content
							className='w-[min(20rem,calc(100vw-1rem))]'
							data-shell-sidebar-sheet='true'
							style={{ '--sidebar-width': '100%' } as CSSProperties}
						>
							<Sheet.Dialog
								className='h-full overflow-hidden'
								render={(dialogProps) => (
									<section
										{...dialogProps}
										onKeyDown={(event) => {
											if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
										}}
									/>
								)}
							>
								<Sheet.Heading className='sr-only'>导航</Sheet.Heading>
								{sidebarNavigation}
							</Sheet.Dialog>
						</Sheet.Content>
					</Sheet.Backdrop>
				</Sheet>
			) : null}
			<ShellFooter />
		</>
	)
}
