import { useEffect, useState } from 'react'

import {
	getEntityActivities,
	type ActivityTimelineEntry,
} from '@/features/activity/api/getEntityActivities'
import { DetailSection } from '@/shared/ui/detail'
import { StatusNotice } from '@/shared/ui/StatusNotice'

type LoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; entries: ActivityTimelineEntry[] }
	| { kind: 'error'; message: string }

type TaskActivityTimelineProps = {
	taskId: string
}

/**
 * Task Page 专用 Activity 列表。
 * V1 只做轻量列表和基础字段变化展开，不引入复杂筛选、分组或协作回复。
 */
export function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
	const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' })

	useEffect(() => {
		let cancelled = false
		setLoadState({ kind: 'loading' })

		void (async () => {
			try {
				const entries = await getEntityActivities({
					entityType: 'task',
					entityId: taskId,
					limit: 50,
				})

				if (!cancelled) {
					setLoadState({ kind: 'ready', entries })
				}
			} catch (error) {
				if (!cancelled) {
					setLoadState({
						kind: 'error',
						message: error instanceof Error ? error.message : '读取 Activity 失败',
					})
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [taskId])

	return (
		<DetailSection description='这里展示该任务的操作历史与字段变化。' title='Activity'>
			{loadState.kind === 'loading' ? (
				<StatusNotice description='正在读取任务 Activity。' title='读取中' variant='neutral' />
			) : null}

			{loadState.kind === 'error' ? (
				<StatusNotice description={loadState.message} title='Activity 读取失败' variant='danger' />
			) : null}

			{loadState.kind === 'ready' && loadState.entries.length === 0 ? (
				<StatusNotice
					description='当前任务还没有任何 Activity 记录。'
					title='暂无 Activity'
					variant='neutral'
				/>
			) : null}

			{loadState.kind === 'ready' && loadState.entries.length > 0 ? (
				<div className='flex flex-col gap-3'>
					{loadState.entries.map((entry) => (
						<article
							className='rounded-xl border border-sf-border-subtle bg-card px-3 py-3'
							key={entry.id}
						>
							<div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-sf-text-tertiary'>
								<span className='rounded-full bg-muted px-2 py-0.5 font-medium text-foreground'>
									{entry.action}
								</span>
								<span>{entry.source}</span>
								<span>{formatTimestamp(entry.createdAt)}</span>
							</div>

							{entry.summary ? (
								<p className='mt-2 text-sm leading-6 text-foreground'>{entry.summary}</p>
							) : null}

							{entry.metadata ? (
								<details className='mt-3 rounded-lg border border-sf-border-subtle bg-muted/35 px-3 py-2'>
									<summary className='cursor-pointer text-[12px] font-medium text-foreground'>
										Metadata
									</summary>
									<pre className='mt-2 overflow-x-auto text-[11px] leading-5 text-sf-text-secondary'>
										{JSON.stringify(entry.metadata, null, 2)}
									</pre>
								</details>
							) : null}

							{entry.changes.length > 0 ? (
								<details className='mt-3 rounded-lg border border-sf-border-subtle bg-muted/35 px-3 py-2'>
									<summary className='cursor-pointer text-[12px] font-medium text-foreground'>
										字段变化 ({entry.changes.length})
									</summary>
									<div className='mt-2 flex flex-col gap-2'>
										{entry.changes.map((change) => (
											<div
												className='rounded-lg border border-sf-border-subtle bg-card px-3 py-2'
												key={change.id}
											>
												<div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-sf-text-tertiary'>
													<span className='font-medium text-foreground'>{change.field}</span>
													<span>{formatTimestamp(change.createdAt)}</span>
												</div>
												<div className='mt-2 grid gap-2 md:grid-cols-2'>
													<ValuePanel label='旧值' value={change.oldValue} />
													<ValuePanel label='新值' value={change.newValue} />
												</div>
											</div>
										))}
									</div>
								</details>
							) : null}
						</article>
					))}
				</div>
			) : null}
		</DetailSection>
	)
}

function ValuePanel({ label, value }: { label: string; value: unknown | null }) {
	return (
		<div className='rounded-md border border-sf-border-subtle bg-muted/30 px-3 py-2'>
			<p className='text-[11px] font-medium text-sf-text-tertiary'>{label}</p>
			<pre className='mt-1 overflow-x-auto text-[11px] leading-5 text-sf-text-secondary'>
				{value === null ? 'null' : JSON.stringify(value, null, 2)}
			</pre>
		</div>
	)
}

function formatTimestamp(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	}).format(date)
}
