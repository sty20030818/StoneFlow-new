import type { Location } from 'react-router-dom'

import {
	buildProjectDetailPath,
	buildProjectShortcutPath,
	buildTaskDetailPath,
	buildTaskShortcutPath,
} from '@/app/routing'
import { getProjectDetail } from '@/features/project/api/projects'
import { getTaskDetail } from '@/features/task/api/tasks'
import {
	buildEntityDetailSearch,
	clearEntityDetailSearch,
	parseEntityDetailRouteState,
} from './entityDetailRouteState'
import type { EntityDetailNavigationTarget, EntityDetailTarget } from './entityDetailTypes'

export function openEntityDrawerTarget(
	location: Pick<Location, 'pathname' | 'search'>,
	target: EntityDetailTarget,
): EntityDetailNavigationTarget {
	const current = parseEntityDetailRouteState(location.search).activeDetail

	return {
		pathname: location.pathname,
		search: buildEntityDetailSearch(location.search, target),
		replace: Boolean(current),
	}
}

export function closeEntityDrawerTarget(
	location: Pick<Location, 'pathname' | 'search'>,
): EntityDetailNavigationTarget {
	return {
		pathname: location.pathname,
		search: clearEntityDetailSearch(location.search),
		replace: true,
	}
}

export function openEntityPageTarget(target: EntityDetailTarget): EntityDetailNavigationTarget {
	const pathname =
		target.kind === 'task'
			? buildTaskShortcutPath(target.id)
			: buildProjectShortcutPath(target.id)

	return {
		pathname,
		search: '',
		replace: false,
	}
}

export async function resolveEntityPageTarget(
	target: EntityDetailTarget,
): Promise<EntityDetailNavigationTarget> {
	if (target.kind === 'task') {
		const detail = await getTaskDetail(target.id)
		return {
			pathname: buildTaskDetailPath(detail.spaceId, detail.id),
			search: '',
			replace: false,
		}
	}

	const detail = await getProjectDetail(target.id)
	return {
		pathname: buildProjectDetailPath(detail.spaceId, detail.id),
		search: '',
		replace: false,
	}
}
