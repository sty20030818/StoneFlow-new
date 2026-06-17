import { buildProjectPath, buildTaskDetailPath } from '@/app/routing'
import { getProjectDetail } from '@/features/project/api/projects'
import { getTaskDetail } from '@/features/task/api/tasks'
import {
	buildEntityDetailSearch,
	clearEntityDetailSearch,
	parseEntityDetailRouteState,
} from './entityDetailRouteState'
import type { EntityDetailNavigationTarget, EntityDetailTarget } from './entityDetailTypes'

type LocationLike = {
	pathname: string
	search: string
}

export function openEntityDrawerTarget(
	location: LocationLike,
	target: EntityDetailTarget,
): EntityDetailNavigationTarget {
	const current = parseEntityDetailRouteState(location.search).activeDetail

	return {
		pathname: location.pathname,
		search: buildEntityDetailSearch(location.search, target),
		replace: Boolean(current),
	}
}

export function closeEntityDrawerTarget(location: LocationLike): EntityDetailNavigationTarget {
	return {
		pathname: location.pathname,
		search: clearEntityDetailSearch(location.search),
		replace: true,
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
		pathname: buildProjectPath(detail.spaceId, detail.id),
		search: '',
		replace: false,
	}
}
