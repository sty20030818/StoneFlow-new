import { useEffect, useRef, useState } from 'react'
import { trimPathRight, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'

import { openView, useCurrentRouteSource } from '@/app/navigation'
import { normalizeSubmitError } from '@/shared/form/normalize-submit-error'
import { useLatestRef } from '@/shared/lib/useLatestRef'
import type { CreateViewInput, FilterQuery, Scope, View } from '@/shared/types'

import { useCreateViewMutation, useUpdateViewMutation } from './view.mutations'

export type ViewSaveCommand =
	| { mode: 'create'; input: CreateViewInput }
	| { mode: 'overwrite'; input: { viewId: string; filters: FilterQuery } }
	| { mode: 'rename'; input: { viewId: string; name: string } }

export type ViewSaveFlow = {
	open: boolean
	sessionKey: number
	pending: ViewSaveCommand['mode'] | 'open' | null
	error: { kind: 'write' | 'open'; message: string } | null
	savedView: View | null
	begin: () => void
	close: () => void
	submit: (command: ViewSaveCommand) => Promise<void>
	retryOpen: () => Promise<void>
}

type SaveState = Pick<ViewSaveFlow, 'open' | 'sessionKey' | 'pending' | 'error' | 'savedView'> & {
	source: string
}

/** 保存与打开属于同一会话；关闭或离开后仅保留 mutation 自身的缓存失效。 */
export function useViewSaveFlow({
	scope,
	spaceId,
}: {
	scope: Scope
	spaceId: string | null
}): ViewSaveFlow {
	const navigate = useNavigate({ from: '/' })
	const router = useRouter()
	const routeSource = useCurrentRouteSource()
	const source = useRouterState({ select: (state) => state.location.href })
	const createView = useCreateViewMutation()
	const updateView = useUpdateViewMutation()
	const [state, setState] = useState<SaveState>({
		source,
		open: false,
		sessionKey: 0,
		pending: null,
		error: null,
		savedView: null,
	})
	if (source !== state.source) {
		setState({
			source,
			open: false,
			sessionKey: state.sessionKey + 1,
			pending: null,
			error: null,
			savedView: null,
		})
	}
	const latest = useLatestRef(state)
	const request = useRef(0)
	const inFlight = useRef(false)
	useEffect(
		() => () => {
			request.current += 1
		},
		[],
	)

	function reset(open: boolean) {
		request.current += 1
		inFlight.current = false
		setState((previous) => ({
			source,
			open,
			sessionKey: previous.sessionKey + 1,
			pending: null,
			error: null,
			savedView: null,
		}))
	}

	async function openSaved(savedView: View, isCurrent: () => boolean) {
		if (!isCurrent()) return
		setState((previous) => ({ ...previous, savedView, pending: 'open', error: null }))
		const to = openView(scope, savedView.id, spaceId)
		try {
			const target = router.buildLocation({ to: to as never, search: {} as never })
			// Saved View 路由没有数据 loader；先载入 lazy chunk 与 beforeLoad，失败时来源 URL 尚未改变。
			const matches = await router.preloadRoute({ to: to as never, search: {} as never })
			if (!isCurrent()) return
			const failedMatch = matches?.find((match) => match.status !== 'success')
			if (
				!matches?.length ||
				failedMatch ||
				trimPathRight(matches.at(-1)!.pathname) !== trimPathRight(to)
			) {
				throw failedMatch?.error ?? new Error('目标页面尚未就绪，请重试打开视图。')
			}
			// 当前 Router 在 history blocker 拒绝时不结束 navigate Promise。
			// 与 Router 的 documentNavigation 共用 History blocker 契约，检查一次后再提交；
			// 升级到可观测 blocked 结果的 Router 后，删除本接缝并直接等待正式导航结果。
			for (const blocker of router.history._getBlockers()) {
				const blocked = await blocker.blockerFn({
					currentLocation: router.history.location,
					nextLocation: {
						href: target.href,
						pathname: target.pathname,
						search: target.searchStr,
						hash: target.hash ? `#${target.hash}` : '',
						state: target.state,
					},
					action: 'PUSH',
				})
				if (!isCurrent()) return
				if (blocked) throw new Error('当前页面暂时阻止了切换，请处理后重试。')
			}
			if (!isCurrent()) return
			await navigate({ to: to as never, search: {} as never, ignoreBlocker: true })
			if (
				trimPathRight(router.state.location.pathname) !== trimPathRight(to) ||
				router.state.location.searchStr
			) {
				throw new Error('页面切换未完成')
			}
			if (isCurrent()) reset(false)
		} catch (error) {
			if (isCurrent()) {
				setState((previous) => ({
					...previous,
					pending: null,
					error: {
						kind: 'open',
						message: normalizeSubmitError(error, '请重试打开视图。'),
					},
				}))
			}
		}
	}

	async function run(command?: ViewSaveCommand) {
		if (!state.open || inFlight.current || !routeSource.isCurrent()) return
		if (command && state.savedView) return
		if (!command && !state.savedView) return
		// 在 await 前固定输入，后续页面与表单变化不能改写这次提交。
		const snapshot = command ? structuredClone(command) : null
		const session = state.sessionKey
		const token = ++request.current
		const isCurrent = () =>
			request.current === token &&
			latest.current.open &&
			latest.current.sessionKey === session &&
			latest.current.source === source &&
			router.state.location.href === source &&
			routeSource.isCurrent()
		inFlight.current = true
		setState((previous) => ({ ...previous, pending: command?.mode ?? 'open', error: null }))
		try {
			if (!snapshot) {
				await openSaved(state.savedView!, isCurrent)
				return
			}
			const savedView =
				snapshot.mode === 'create'
					? await createView.mutateAsync(snapshot.input)
					: await updateView.mutateAsync(snapshot.input)
			if (!isCurrent()) return
			if (snapshot.mode === 'rename') reset(false)
			else await openSaved(savedView, isCurrent)
		} catch (error) {
			if (isCurrent())
				setState((previous) => ({
					...previous,
					pending: null,
					error: {
						kind: 'write',
						message: normalizeSubmitError(error, '保存失败，请重试。'),
					},
				}))
		} finally {
			if (request.current === token) inFlight.current = false
		}
	}

	return {
		...state,
		begin: () => reset(true),
		close: () => reset(false),
		submit: run,
		retryOpen: () => run(),
	}
}
