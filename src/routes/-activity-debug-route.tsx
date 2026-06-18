import { Button } from '@/shared/ui/base/button'
import { Link, getRouteApi } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'

import {
	getEntityActivities,
	type ActivityEntityType,
} from '@/features/activity/api/getEntityActivities'
import {
	ActivityDebugPage,
	type ActivityDebugLoadState,
} from '@/features/activity/ui/ActivityDebugPage'

import { normalizeActivityDebugSearch } from './-activity-debug-search'

const activityDebugRoute = getRouteApi('/debug/activity')

/**
 * route-private 组件：负责 search contract、导航和数据装配。
 * 业务展示仍下沉到 feature page，避免 feature 反向依赖 route file。
 */
export function ActivityDebugRoute() {
	const search = activityDebugRoute.useSearch()
	const navigate = activityDebugRoute.useNavigate()
	const [entityType, setEntityType] = useState<ActivityEntityType>(search.entityType)
	const [entityId, setEntityId] = useState(search.entityId)
	const [limit, setLimit] = useState(String(search.limit))
	const [loadState, setLoadState] = useState<ActivityDebugLoadState>({ kind: 'idle' })

	useEffect(() => {
		setEntityType(search.entityType)
		setEntityId(search.entityId)
		setLimit(String(search.limit))
	}, [search.entityId, search.entityType, search.limit])

	useEffect(() => {
		if (!search.entityId) {
			setLoadState({ kind: 'idle' })
			return
		}

		let cancelled = false
		setLoadState({ kind: 'loading' })

		void (async () => {
			try {
				const entries = await getEntityActivities({
					entityType: search.entityType,
					entityId: search.entityId,
					limit: search.limit,
				})

				if (!cancelled) {
					setLoadState({
						kind: 'ready',
						entries,
					})
				}
			} catch {
				if (!cancelled) {
					setLoadState({
						kind: 'error',
						message:
							'无法读取 Rust 宿主 Activity 数据，请确认当前运行在 Tauri 环境且数据库已就绪。',
					})
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [search.entityId, search.entityType, search.limit])

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const trimmedEntityId = entityId.trim()
		if (!trimmedEntityId) {
			setLoadState({
				kind: 'error',
				message: '请先输入 entity id，再发起查询。',
			})
			return
		}

		void navigate({
			replace: true,
			search: normalizeActivityDebugSearch({
				entityType,
				entityId: trimmedEntityId,
				limit,
			}),
		})
	}

	return (
		<ActivityDebugPage
			backAction={
				<Button asChild className='h-10 rounded-lg' type='button' variant='ghost'>
					<Link from='/' to='/all/inbox'>
						返回
					</Link>
				</Button>
			}
			entityId={entityId}
			entityType={entityType}
			limit={limit}
			loadState={loadState}
			onEntityIdChange={setEntityId}
			onEntityTypeChange={setEntityType}
			onLimitChange={setLimit}
			onSubmit={handleSubmit}
		/>
	)
}
