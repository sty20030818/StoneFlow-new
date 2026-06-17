import { useCallback, useEffect, useMemo, startTransition } from 'react'

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
import type { EntityDetailTarget } from './entityDetailTypes'
import { useLocation, useNavigate } from '@/app/routing/tanstackCompat'

export function useEntityDetailController() {
	const location = useLocation()
	const navigate = useNavigate()
	const parsedRouteState = useMemo(
		() => parseEntityDetailRouteState(location.search),
		[location.search],
	)
	const activeDetail = parsedRouteState.activeDetail

	useEffect(() => {
		if (!parsedRouteState.shouldCleanSearch) {
			return
		}

		startTransition(() => {
			navigate(
				{
					pathname: location.pathname,
					search: activeDetail
						? buildEntityDetailSearch(location.search, activeDetail)
						: clearEntityDetailSearch(location.search),
				},
				{ replace: true },
			)
		})
	}, [
		activeDetail,
		location.pathname,
		location.search,
		navigate,
		parsedRouteState.shouldCleanSearch,
	])

	const openDrawer = useCallback(
		(target: EntityDetailTarget) => {
			const nextTarget = openEntityDrawerTarget(location, target)
			startTransition(() => {
				navigate(
					{
						pathname: nextTarget.pathname,
						search: nextTarget.search,
					},
					{ replace: nextTarget.replace },
				)
			})
		},
		[location, navigate],
	)

	const closeDrawer = useCallback(() => {
		const nextTarget = closeEntityDrawerTarget(location)
		startTransition(() => {
			navigate(
				{
					pathname: nextTarget.pathname,
					search: nextTarget.search,
				},
				{ replace: nextTarget.replace },
			)
		})
	}, [location, navigate])

	const openPage = useCallback(
		(target: EntityDetailTarget) => {
			void resolveEntityPageTarget(target)
				.then((nextTarget) => {
					startTransition(() => {
						navigate(
							{
								pathname: nextTarget.pathname,
								search: '',
							},
							{ replace: nextTarget.replace },
						)
					})
				})
				.catch((error) => {
					console.error('无法解析独立详情页 canonical route', error)
				})
		},
		[navigate],
	)

	return {
		activeDetail,
		isOpen: Boolean(activeDetail),
		openDrawer,
		closeDrawer,
		openPage,
	}
}
