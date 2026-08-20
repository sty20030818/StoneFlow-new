import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
	type CSSProperties,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Sidebar } from '@heroui-pro/react'

import type { AppLayoutProps } from '@/layout/appLayoutTypes'
import { useShellSessionRouteHistory } from '@/app/navigation'
import { useShellChromeData } from '@/layout/model/useShellChromeData'
import { useShellCreateDialogState } from '@/layout/model/useShellCreateDialogState'
import { useShellCommandSystem } from '@/layout/model/useShellCommandSystem'
import { useShellSidebarController } from '@/layout/model/useShellSidebarController'
import { useSettingsReturnPath } from '@/layout/model/useSettingsReturnPath'
import { ShellChrome } from '@/layout/ShellChrome'
import { ShellLayoutSkeleton } from '@/layout/ShellLayoutSkeleton'
import { ShellOverlays } from '@/layout/overlays/ShellOverlays'
import { BulkActionBar } from '@/features/bulk-action'
import { SyncStatusProvider } from '@/features/sync'
import { CommandRuntimeProvider } from '@/features/command'
import { useUpdateEvents } from '@/features/update'
import { getUpdateSettings, type UpdateChannel } from '@/features/update/contract'
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
	const [changelogIntent, setChangelogIntent] = useState<{
		open: boolean
		focusVersion: string | null
		channel: UpdateChannel
	}>({ open: false, focusVersion: null, channel: 'stable' })
	const [isAboutOpen, setIsAboutOpen] = useState(false)
	const openChangelog = useCallback(
		(focusVersion: string | null = null, channel?: UpdateChannel) => {
			setChangelogIntent((current) => ({
				...current,
				open: true,
				focusVersion,
				channel: channel ?? current.channel,
			}))
		},
		[],
	)
	useUpdateEvents(openChangelog)
	useEffect(() => {
		if (!changelogIntent.open || changelogIntent.focusVersion) return
		let active = true
		void getUpdateSettings()
			.then((settings) => {
				if (active) {
					setChangelogIntent((current) => ({ ...current, channel: settings.channel }))
				}
			})
			.catch(() => undefined)
		return () => {
			active = false
		}
	}, [changelogIntent.focusVersion, changelogIntent.open])

	const isSettingsMode = shellRoute.isSettingsPath
	/** 进入设置前的工作路径（边沿捕获）；供「返回应用」与 Esc 关层 */
	const settingsReturnPath = useSettingsReturnPath(shellRoute, currentScope)

	const chrome = useShellChromeData(currentScope)
	const navigate = useNavigate({ from: '/' })

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

	const sidebar = useShellSidebarController({
		initialPreferences: {
			width: chrome.sidebarSettings?.width ?? 256,
			desktopPreference: chrome.sidebarSettings?.desktopPreference ?? 'expanded',
		},
		onPreferencesCommit: (preferences) => {
			void chrome.setSidebarPreferences(preferences)
		},
	})
	const closeMobileSidebar = sidebar.setMobileSheetOpen
	useEffect(() => closeMobileSidebar(false), [closeMobileSidebar, shellRoute.fullPath])

	const command = useShellCommandSystem({
		currentScope,
		currentSpaceId,
		activeSection,
		shellRoute,
		handleOpenTaskCreate,
		openTaskCreateDialog: createDialog.openTaskCreateDialog,
		openProjectCreateDialog: createDialog.openProjectCreateDialog,
		goBack: routeHistory.goBack,
		goForward: routeHistory.goForward,
		canGoBack: routeHistory.canGoBack,
		isSettingsMode,
		settingsReturnPath,
		toggleSidebar: sidebar.toggleSidebar,
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

	/** 命令板已缓存全量项目则优先；否则回退侧栏列表 */
	const headerProjects =
		command.commandProjects.length > 0 ? command.commandProjects : chrome.sidebarProjectLinks

	return (
		<Sidebar.Provider
			className='sf-shell-layout group/sidebar-wrapper relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-secondary'
			collapsible='icon'
			data-sidebar-mode={sidebar.mode}
			navigate={(href) => {
				sidebar.setMobileSheetOpen(false)
				void navigate({ to: href as never })
			}}
			onOpenChange={sidebar.setDesktopOpen}
			open={sidebar.providerOpen}
			style={{ '--sidebar-width': `${sidebar.liveWidth}px` } as CSSProperties}
			toggleShortcut={false}
			variant='inset'
		>
			<BootShellDismiss />
			<SyncStatusProvider>
				<CommandRuntimeProvider context={command.commandContext} runtime={command.commandRuntime}>
					<ShellChrome
						activeSection={activeSection}
						chrome={chrome}
						command={command}
						createDialog={createDialog}
						currentScope={currentScope}
						currentSpaceId={currentSpaceId}
						handleOpenTaskCreate={handleOpenTaskCreate}
						onOpenChangelog={() => openChangelog()}
						onOpenAbout={() => setIsAboutOpen(true)}
						headerProjects={headerProjects}
						isSettingsMode={isSettingsMode}
						routeHistory={routeHistory}
						settingsReturnPath={settingsReturnPath}
						shellRoute={shellRoute}
						sidebar={sidebar}
					>
						{children}
					</ShellChrome>
					<BulkActionBar context={command.commandContext} runtime={command.commandRuntime} />
					<ShellOverlays
						closeCustomDateDialog={createDialog.closeCustomDateDialog}
						closeProjectCreateDialog={createDialog.closeProjectCreateDialog}
						closeTaskCreateDialog={createDialog.closeTaskCreateDialog}
						changelogOpen={changelogIntent.open}
						changelogChannel={changelogIntent.channel}
						changelogFocusVersion={changelogIntent.focusVersion}
						aboutOpen={isAboutOpen}
						createDialogType={createDialog.createDialogType}
						currentScope={currentScope}
						customDateDialog={createDialog.customDateDialog}
						defaultCreateSpaceId={createDialog.defaultCreateSpaceId}
						projectOptions={chrome.projectOptions}
						projectsLoading={chrome.sidebarProjects.status === 'loading'}
						onChangelogOpenChange={(open) =>
							setChangelogIntent((current) => ({ ...current, open }))
						}
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
				</CommandRuntimeProvider>
			</SyncStatusProvider>
		</Sidebar.Provider>
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
