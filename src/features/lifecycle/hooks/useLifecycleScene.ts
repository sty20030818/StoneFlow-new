import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
	openSection,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useEntityDetailController } from '@/features/entity-detail'
import { useGroupedCollectionInteraction, useRegisterCommandSelection } from '@/features/selection'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { useLifecycleEntriesQuery } from './lifecycle.queries'
import { buildLifecycleCommandSelection } from '../model/buildLifecycleCommandSelection'
import {
	buildLifecycleSections,
	LIFECYCLE_SECTION_ORDER,
	type LifecycleEntityFilter,
} from '../model/buildLifecycleSections'
import type { LifecycleBoardProps } from '../components/LifecycleBoard'

const EMPTY_LIFECYCLE_ENTRIES: LifecycleEntry[] = []

/**
 * 归档/回收站页唯一 wiring：列表 / 筛选 / 选择 / bulk / 打开详情。
 * 写路径经本域 mutations → api 委托 task/project/space public。
 */
export function useLifecycleScene(mode: LifecycleMode) {
	const navigate = useNavigate({ from: '/' })
	const openTaskDetail = useEntityDetailController().openTaskDetail
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const entriesQuery = useLifecycleEntriesQuery(mode, scope)
	const [entityFilter, setEntityFilter] = useState<LifecycleEntityFilter>('all')

	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])

	const sliceStatus = entriesQuery.isError
		? 'error'
		: entriesQuery.isLoading || entriesQuery.isPending
			? 'loading'
			: 'ready'
	const sliceItems = entriesQuery.data ?? EMPTY_LIFECYCLE_ENTRIES
	const sections = useMemo(
		() => buildLifecycleSections(sliceItems, entityFilter, mode, scope),
		[entityFilter, mode, sliceItems, scope],
	)
	const lifecycleGroups = useMemo(
		() =>
			sections.map((section) => ({
				key: section.key,
				itemKeys: section.items.map((entry) => entry.id),
			})),
		[sections],
	)
	const lifecycleCollection = useGroupedCollectionInteraction({
		groups: lifecycleGroups,
		defaultOpenGroupKeys: LIFECYCLE_SECTION_ORDER,
	})
	const selectedEntryIds = useMemo(
		() =>
			lifecycleCollection.interaction.projection.eligibleKeys.filter((entryId) =>
				lifecycleCollection.interaction.selectedKeys.has(entryId),
			),
		[
			lifecycleCollection.interaction.projection.eligibleKeys,
			lifecycleCollection.interaction.selectedKeys,
		],
	)

	const commandSelection = useMemo(
		() =>
			buildLifecycleCommandSelection({
				selectedIds: selectedEntryIds,
				entries: sliceItems,
				mode,
				focusedEntryId: lifecycleCollection.interaction.focusedKey,
				clearSelection: lifecycleCollection.interaction.clearSelection,
			}),
		[
			lifecycleCollection.interaction.clearSelection,
			lifecycleCollection.interaction.focusedKey,
			mode,
			selectedEntryIds,
			sliceItems,
		],
	)
	const readCommandSelection = useCallback(() => commandSelection, [commandSelection])
	useRegisterCommandSelection(readCommandSelection)
	const showSpacePill = scope.type === 'all'
	const scopeItems = showSpacePill
		? sliceItems
		: sliceItems.filter((entry) => entry.entityType !== 'space')

	const toolbarPills = [
		{
			key: 'all' as const,
			label: `${mode === 'archive' ? '所有归档' : '所有删除'} ${scopeItems.length}`,
		},
		...(showSpacePill
			? [
					{
						key: 'space' as const,
						label: `空间 ${sliceItems.filter((entry) => entry.entityType === 'space').length}`,
					},
				]
			: []),
		{
			key: 'project' as const,
			label: `项目 ${scopeItems.filter((entry) => entry.entityType === 'project').length}`,
		},
		{
			key: 'task' as const,
			label: `任务 ${scopeItems.filter((entry) => entry.entityType === 'task').length}`,
		},
	]

	function handleOpenDetail(entry: LifecycleEntry) {
		if (entry.entityType === 'task') {
			openTaskDetail(entry.id)
			return
		}

		if (entry.entityType === 'space' && entry.spaceId) {
			void navigate({
				to: openSection(
					{ type: 'space', spaceId: entry.spaceId },
					'standalone',
					entry.spaceId,
				) as never,
			})
		}
	}

	const lifecycleBoardProps: LifecycleBoardProps = {
		mode,
		sections,
		collection: lifecycleCollection,
		status: sliceStatus,
		emptyActionLabel: '返回独立事项',
		emptyDescription:
			mode === 'archive'
				? '归档后的任务和项目会放在这里。点「返回独立事项」先回去继续处理手头内容就好。'
				: '删除后的任务和项目会先来到这里。点「返回独立事项」先回去继续处理内容就好。',
		emptyTitle: mode === 'archive' ? '当前没有已归档内容' : '当前没有已删除内容',
		onEmptyAction: () => {
			void navigate({ to: openSection(scope, 'standalone', spaceId) as never })
		},
		onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
	}

	return {
		mode,
		lifecycleBoardProps,
		breadcrumbItems,
		toolbarPills,
		selectedToolbarKey: entityFilter,
		selectToolbar: (key: string) => setEntityFilter(key as LifecycleEntityFilter),
	}
}
