import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
	type ActivityEntityType,
	type ActivityTimelineEntry,
	getEntityActivities,
} from '@/features/activity/api/getEntityActivities'
import { buildCanonicalSectionPath, useShellRoute } from '@/app/routing'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import {
	activityDebugCompactCodeBlockClass,
	activityDebugCodeBlockClass,
	activityDebugDetailsEmptyTextClass,
	activityDebugDetailsClass,
	activityDebugFieldLabelClass,
	activityDebugMetaRowClass,
} from '@/shared/ui/patterns/activity-debug'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { StatusNotice } from '@/shared/ui/StatusNotice'

const ENTITY_TYPE_OPTIONS: Array<{ value: ActivityEntityType; label: string }> = [
	{ value: 'task', label: 'Task' },
	{ value: 'project', label: 'Project' },
	{ value: 'space', label: 'Space' },
	{ value: 'view', label: 'View' },
	{ value: 'setting', label: 'Setting' },
]

const ALL_SCOPE = { type: 'all' } as const

type LoadState =
	| { kind: 'idle' }
	| { kind: 'loading' }
	| { kind: 'ready'; entries: ActivityTimelineEntry[] }
	| { kind: 'error'; message: string }

/**
 * 隐藏调试页：只用于按实体读取 Activity timeline，不接正式业务入口。
 */
export function ActivityDebugPage() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE
	const spaceId = shellRoute.spaceId
	const [searchParams, setSearchParams] = useSearchParams()
	const [entityType, setEntityType] = useState<ActivityEntityType>(
		(searchParams.get('entityType') as ActivityEntityType | null) ?? 'task',
	)
	const [entityId, setEntityId] = useState(searchParams.get('entityId') ?? '')
	const [limit, setLimit] = useState(searchParams.get('limit') ?? '50')
	const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' })

	useEffect(() => {
		const nextEntityType = searchParams.get('entityType') as ActivityEntityType | null
		const nextEntityId = searchParams.get('entityId')
		const nextLimit = searchParams.get('limit')

		if (!nextEntityType || !nextEntityId) {
			setLoadState({ kind: 'idle' })
			return
		}

		setEntityType(nextEntityType)
		setEntityId(nextEntityId)
		setLimit(nextLimit ?? '50')
		let cancelled = false
		setLoadState({ kind: 'loading' })

		void (async () => {
			try {
				const parsedLimit = Number(nextLimit ?? '50')
				const entries = await getEntityActivities({
					entityType: nextEntityType,
					entityId: nextEntityId,
					limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
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
	}, [searchParams])

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

		setSearchParams({
			entityType,
			entityId: trimmedEntityId,
			limit: limit.trim() || '50',
		})
	}

	return (
		<MainCard.Root>
			<MainCard.Header title='Activity Debug' />
			<MainCard.Body className='gap-4 p-4'>
				<form
					className='grid gap-3 rounded-xl border border-sf-border-subtle bg-card p-4 md:grid-cols-[180px_minmax(0,1fr)_120px_auto]'
					onSubmit={handleSubmit}
				>
					<label className='space-y-1.5'>
						<span className={activityDebugFieldLabelClass}>Entity Type</span>
						<Select
							onValueChange={(value) => setEntityType(value as ActivityEntityType)}
							value={entityType}
						>
							<SelectTrigger aria-label='实体类型' className='h-10 w-full'>
								<SelectValue placeholder='选择实体类型' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{ENTITY_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='space-y-1.5'>
						<span className={activityDebugFieldLabelClass}>Entity ID</span>
						<Input
							className='h-10'
							onChange={(event) => setEntityId(event.currentTarget.value)}
							placeholder='例如 task-1 / project-42'
							value={entityId}
						/>
					</label>

					<label className='space-y-1.5'>
						<span className={activityDebugFieldLabelClass}>Limit</span>
						<Input
							className='h-10'
							inputMode='numeric'
							onChange={(event) => setLimit(event.currentTarget.value)}
							placeholder='50'
							value={limit}
						/>
					</label>

					<div className='flex items-end gap-2'>
						<Button className='h-10 rounded-lg' type='submit'>
							查询 Activity
						</Button>
						<Button asChild className='h-10 rounded-lg' type='button' variant='ghost'>
							<Link to={buildCanonicalSectionPath(scope, 'inbox', spaceId)}>返回</Link>
						</Button>
					</div>
				</form>

				{loadState.kind === 'idle' ? (
					<StatusNotice
						description='输入 entity type 和 entity id 后即可读取该实体的 Activity timeline。'
						title='等待查询'
						variant='neutral'
					/>
				) : null}

				{loadState.kind === 'loading' ? (
					<StatusNotice
						description='正在向 Rust 宿主请求 Activity timeline。'
						title='读取中'
						variant='warning'
					/>
				) : null}

				{loadState.kind === 'error' ? (
					<StatusNotice description={loadState.message} title='查询失败' variant='danger' />
				) : null}

				{loadState.kind === 'ready' && loadState.entries.length === 0 ? (
					<StatusNotice
						description='当前实体还没有任何 Activity 记录，或者你输入的 entity id 不存在。'
						title='暂无记录'
						variant='neutral'
					/>
				) : null}

				{loadState.kind === 'ready' && loadState.entries.length > 0 ? (
					<div className='space-y-3'>
						{loadState.entries.map((entry) => (
							<article
								className='space-y-3 rounded-xl border border-sf-border-subtle bg-card p-4'
								key={entry.id}
							>
								<div className={activityDebugMetaRowClass}>
									<span className='rounded-full bg-muted px-2.5 py-1 font-medium text-foreground'>
										{entry.action}
									</span>
									<span>{entry.entityType}</span>
									<span>{entry.entityId}</span>
									<span>{entry.actorType}</span>
									<span>{entry.source}</span>
									<span>{entry.createdAt}</span>
								</div>

								{entry.summary ? (
									<p className='text-sm leading-6 text-foreground'>{entry.summary}</p>
								) : null}

								{entry.metadata ? (
									<div className='space-y-1.5'>
										<p className={activityDebugFieldLabelClass}>Metadata</p>
										<pre className={activityDebugCodeBlockClass}>
											{JSON.stringify(entry.metadata, null, 2)}
										</pre>
									</div>
								) : null}

								<details className={activityDebugDetailsClass}>
									<summary className='cursor-pointer text-sm font-medium text-foreground'>
										字段变化 ({entry.changes.length})
									</summary>
									{entry.changes.length === 0 ? (
										<p className={activityDebugDetailsEmptyTextClass}>这条事件没有附带字段变化。</p>
									) : (
										<div className='mt-3 space-y-3'>
											{entry.changes.map((change) => (
												<div
													className='rounded-lg border border-sf-border-subtle bg-card p-3'
													key={change.id}
												>
													<div className={activityDebugMetaRowClass}>
														<span className='font-medium text-foreground'>{change.field}</span>
														<span>{change.createdAt}</span>
													</div>
													<div className='mt-2 grid gap-2 md:grid-cols-2'>
														<pre className={activityDebugCompactCodeBlockClass}>
															{JSON.stringify(change.oldValue, null, 2)}
														</pre>
														<pre className={activityDebugCompactCodeBlockClass}>
															{JSON.stringify(change.newValue, null, 2)}
														</pre>
													</div>
												</div>
											))}
										</div>
									)}
								</details>
							</article>
						))}
					</div>
				) : null}
			</MainCard.Body>
		</MainCard.Root>
	)
}
