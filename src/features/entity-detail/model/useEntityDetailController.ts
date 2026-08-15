import { useCallback, useEffect, useMemo, startTransition } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'

import {
	closeEntityDrawerTarget,
	openEntityDrawerTarget,
	resolveEntityPageTarget,
} from './entityDetailNavigation'
import {
	buildEntityDetailSearch,
	clearEntityDetailSearch,
	parseEntityDetailRouteState,
} from './entityDetailRouteState'
import type { EntityDetailDrawerTarget, EntityDetailTarget } from './entityDetailTypes'
import { SHELL_DESKTOP_MEDIA_QUERY } from '@/shared/lib/shellSidebarGeometry'

export function useEntityDetailController() {
	const location = useLocation()
	const navigate = useNavigate({ from: '/' })
	const parsedRouteState = useMemo(
		() => parseEntityDetailRouteState(location.searchStr),
		[location.searchStr],
	)
	const locationTarget = useMemo(
		() => ({ pathname: location.pathname, search: location.searchStr }),
		[location.pathname, location.searchStr],
	)
	const activeDetail = parsedRouteState.activeDetail

	useEffect(() => {
		if (!parsedRouteState.shouldCleanSearch) {
			return
		}

		startTransition(() => {
			void navigate({
				to: location.pathname as never,
				search: searchRecord(
					activeDetail
						? buildEntityDetailSearch(location.searchStr, activeDetail)
						: clearEntityDetailSearch(location.searchStr),
				) as never,
				replace: true,
			})
		})
	}, [
		activeDetail,
		location.pathname,
		location.searchStr,
		navigate,
		parsedRouteState.shouldCleanSearch,
	])

	const openAside = useCallback(
		(target: EntityDetailDrawerTarget) => {
			const nextTarget = openEntityDrawerTarget(locationTarget, target)
			startTransition(() => {
				void navigate({
					to: nextTarget.pathname as never,
					search: searchRecord(nextTarget.search) as never,
					replace: nextTarget.replace,
				})
			})
		},
		[locationTarget, navigate],
	)

	const closeDrawer = useCallback(() => {
		const nextTarget = closeEntityDrawerTarget(locationTarget)
		startTransition(() => {
			void navigate({
				to: nextTarget.pathname as never,
				search: searchRecord(nextTarget.search) as never,
				replace: nextTarget.replace,
			})
		})
	}, [locationTarget, navigate])

	const openPage = useCallback(
		(target: EntityDetailTarget) => {
			void resolveEntityPageTarget(target)
				.then((nextTarget) => {
					startTransition(() => {
						void navigate({
							to: nextTarget.pathname as never,
							search: {} as never,
							replace: nextTarget.replace,
						})
					})
				})
				.catch((error) => {
					console.error('无法解析独立详情页 canonical route', error)
				})
		},
		[navigate],
	)

	const openTaskDetail = useCallback(
		(taskId: string) => {
			const target = { kind: 'task', id: taskId } as const
			if (shouldOpenTaskAside()) {
				openAside(target)
				return
			}

			void openPage(target)
		},
		[openAside, openPage],
	)

	return {
		activeDetail,
		isOpen: Boolean(activeDetail),
		openTaskDetail,
		closeDrawer,
		openPage,
	}
}

function shouldOpenTaskAside() {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return true
	}

	return window.matchMedia(SHELL_DESKTOP_MEDIA_QUERY).matches
}

function searchRecord(search: string) {
	return Object.fromEntries(new URLSearchParams(search))
}
