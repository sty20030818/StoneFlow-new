import type { Location } from 'react-router-dom'

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
			? `/tasks/${encodeURIComponent(target.id)}`
			: `/projects/${encodeURIComponent(target.id)}`

	return {
		pathname,
		search: '',
		replace: false,
	}
}
