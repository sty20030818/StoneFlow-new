import { useEffect, useMemo } from 'react'

import type { Scope } from '@/shared/types'
import { useSidebarNavBadges } from '@/layout/model/useSidebarNavBadges'
import {
	selectSidebarSettings,
	selectSidebarSettingsError,
	selectSidebarSettingsStatus,
	useSidebarSettingsStore,
} from '@/features/settings'
import { useProjectOptions, useProjectSidebarData } from '@/features/project'
import {
	useArchiveSpaceMutation,
	useCreateSpaceMutation,
	useDeleteSpaceMutation,
	useSetDefaultSpaceMutation,
	useSpaces,
	useUpdateSpaceMutation,
} from '@/features/space'

/**
 * 壳 Chrome 数据面：spaces、侧栏设置/项目、导航 badge、space CRUD mutations。
 * 不负责命令 runtime / dialog store。
 */
export function useShellChromeData(currentScope: Scope) {
	const { spaces, status: spaceStatus, error: spaceError } = useSpaces()

	const sidebarSettingsStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarSettingsError = useSidebarSettingsStore(selectSidebarSettingsError)
	const loadSidebarSettings = useSidebarSettingsStore((state) => state.load)
	const setSidebarWidth = useSidebarSettingsStore((state) => state.setSidebarWidth)
	const setDesktopPreference = useSidebarSettingsStore((state) => state.setDesktopPreference)
	const setSidebarItemVisibility = useSidebarSettingsStore((state) => state.setItemVisibility)
	const resetSidebarMainItemsVisibility = useSidebarSettingsStore(
		(state) => state.resetMainItemsVisibility,
	)

	/** 侧栏项目树（含 taskCount，用于 badge） */
	const sidebarProjects = useProjectSidebarData(currentScope)
	/** 创建任务等用的精简项目选项（与侧栏列表数据源不同） */
	const projectOptions = useProjectOptions(currentScope)
	const navBadges = useSidebarNavBadges(currentScope)

	const createSpace = useCreateSpaceMutation()
	const updateSpace = useUpdateSpaceMutation()
	const setDefaultSpace = useSetDefaultSpaceMutation()
	const archiveSpace = useArchiveSpaceMutation()
	const deleteSpace = useDeleteSpaceMutation()

	useEffect(() => {
		if (sidebarSettingsStatus === 'idle') {
			void loadSidebarSettings()
		}
	}, [loadSidebarSettings, sidebarSettingsStatus])

	/** Header/Sidebar 共用的项目链接形状（含可选计数 badge） */
	const sidebarProjectLinks = useMemo(
		() =>
			sidebarProjects.items.map((project) => ({
				id: project.id,
				label: project.name,
				spaceId: project.spaceId,
				spaceName: spaces.find((space) => space.id === project.spaceId)?.name ?? project.spaceId,
				completedAt: project.completedAt,
				badge: sidebarSettings?.projectSection.showCounts
					? project.taskCount > 0
						? String(project.taskCount)
						: undefined
					: project.completedAt
						? 'done'
						: undefined,
			})),
		[sidebarProjects.items, sidebarSettings?.projectSection.showCounts, spaces],
	)

	const isChromeReady =
		Boolean(sidebarSettings) &&
		spaceStatus !== 'loading' &&
		!(spaceStatus === 'ready' && spaces.length === 0)

	return {
		spaces,
		spaceStatus,
		spaceError,
		sidebarSettings,
		sidebarSettingsStatus,
		sidebarSettingsError,
		sidebarProjects,
		projectOptions,
		navBadges,
		sidebarProjectLinks,
		isChromeReady,
		createSpace,
		updateSpace,
		setDefaultSpace,
		archiveSpace,
		deleteSpace,
		setSidebarWidth,
		setDesktopPreference,
		setSidebarItemVisibility,
		resetSidebarMainItemsVisibility,
	}
}
