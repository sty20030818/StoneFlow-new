import type { ReactNode } from 'react'

import type { Scope } from '@/shared/types'
import type { ShellRoute } from '@/app/navigation'
import type { ShellSectionKey } from '@/layout/types'
import { ShellHeader } from '@/layout/ShellHeader'
import { ShellMain } from '@/layout/ShellMain'
import { SettingsSidebar } from '@/features/settings'
import { ShellSidebar } from '@/layout/ShellSidebar'
import { ShellFooter } from '@/layout/ShellFooter'
import { DEFAULT_SETTINGS_SECTION } from '@/features/settings'
import { CommandShortcutLayer } from '@/features/command'
import type { useShellCommandSystem } from '@/layout/model/useShellCommandSystem'
import type { useShellChromeData } from '@/layout/model/useShellChromeData'
import type { useShellCreateDialogState } from '@/layout/model/useShellCreateDialogState'
import type { useShellSessionRouteHistory } from '@/app/navigation'

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
	/** 顶栏当前 Space 文案 */
	currentSpaceLabel: string
	/** Header 项目列表（命令板缓存或侧栏） */
	headerProjects: CommandHost['commandProjects'] | ChromeData['sidebarProjectLinks']
	chrome: ChromeData
	command: CommandHost
	createDialog: CreateDialog
	routeHistory: RouteHistory
	handleOpenTaskCreate: () => void
	onOpenChangelog: () => void
	onOpenAbout: () => void
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
	currentSpaceLabel,
	headerProjects,
	chrome,
	command,
	createDialog,
	routeHistory,
	handleOpenTaskCreate,
	onOpenChangelog,
	onOpenAbout,
}: ShellChromeProps) {
	return (
		<>
			<CommandShortcutLayer
				bindings={command.activeShortcutBindings}
				onChordStateChange={command.setChordSession}
				onTrigger={command.runCommand}
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
				onRunCommand={command.runCommand}
				onSelectTaskDate={command.onSelectTaskDate}
				onSelectTaskPlacement={command.onSelectTaskPlacement}
				onSelectTaskPriority={command.onSelectTaskPriority}
				onSelectTaskStatus={command.onSelectTaskStatus}
				onShortcutHelpOpenChange={command.setShortcutHelpOpen}
				projects={headerProjects}
				routeHistoryEntries={routeHistory.entries}
				spaces={chrome.spaces}
			/>
			<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-sf-shell'>
				<div className='flex min-h-0 w-(--sf-shell-sidebar-reserved-width) shrink-0 flex-col overflow-hidden transition-[width] duration-(--sf-shell-layout-sync-duration) ease-(--sf-shell-layout-sync-easing) motion-reduce:transition-none group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none'>
					{isSettingsMode ? (
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
			<ShellFooter />
		</>
	)
}
