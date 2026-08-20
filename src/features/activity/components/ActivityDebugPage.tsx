import { Alert, Button, Input, Label, ListBox, Select, Spinner } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'
import type { FormEvent, ReactNode } from 'react'

import type { ActivityEntityType, ActivityTimelineEntry } from '../api/getEntityActivities'
import { PageFrame } from '@/shared/components/page-frame'

const ENTITY_TYPE_OPTIONS: Array<{ value: ActivityEntityType; label: string }> = [
	{ value: 'task', label: 'Task' },
	{ value: 'project', label: 'Project' },
	{ value: 'space', label: 'Space' },
	{ value: 'view', label: 'View' },
	{ value: 'setting', label: 'Setting' },
]

export type ActivityDebugLoadState =
	| { kind: 'idle' }
	| { kind: 'loading' }
	| { kind: 'ready'; entries: ActivityTimelineEntry[] }
	| { kind: 'error'; message: string }

type ActivityDebugPageProps = {
	entityType: ActivityEntityType
	entityId: string
	limit: string
	loadState: ActivityDebugLoadState
	backAction?: ReactNode
	onEntityTypeChange: (entityType: ActivityEntityType) => void
	onEntityIdChange: (entityId: string) => void
	onLimitChange: (limit: string) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

/**
 * 隐藏调试页：只负责展示和表单交互，不承担路由或数据装配。
 */
export function ActivityDebugPage({
	entityType,
	entityId,
	limit,
	loadState,
	backAction = null,
	onEntityTypeChange,
	onEntityIdChange,
	onLimitChange,
	onSubmit,
}: ActivityDebugPageProps) {
	return (
		<PageFrame.Root>
			<PageFrame.Header title='Activity Debug' />
			<PageFrame.Body>
				<div className='flex min-h-0 flex-1 flex-col gap-4 px-2 pt-4 pb-2'>
					<form
						className='grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_120px_auto]'
						onSubmit={onSubmit}
					>
						<Select
							className='w-full'
							onChange={(value) => {
								if (typeof value === 'string') {
									onEntityTypeChange(value as ActivityEntityType)
								}
							}}
							placeholder='选择实体类型'
							value={entityType}
						>
							<Label>Entity Type</Label>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox>
									{ENTITY_TYPE_OPTIONS.map((option) => (
										<ListBox.Item key={option.value} id={option.value} textValue={option.label}>
											{option.label}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</Select.Popover>
						</Select>

						<div className='space-y-1.5'>
							<Label htmlFor='activity-debug-entity-id'>Entity ID</Label>
							<Input
								fullWidth
								id='activity-debug-entity-id'
								onChange={(event) => onEntityIdChange(event.currentTarget.value)}
								placeholder='例如 task-1 / project-42'
								value={entityId}
							/>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='activity-debug-limit'>Limit</Label>
							<Input
								fullWidth
								id='activity-debug-limit'
								inputMode='numeric'
								onChange={(event) => onLimitChange(event.currentTarget.value)}
								placeholder='50'
								value={limit}
							/>
						</div>

						<div className='flex items-end gap-2'>
							<Button type='submit'>查询 Activity</Button>
							{backAction}
						</div>
					</form>

					{loadState.kind === 'idle' ? (
						<EmptyState size='sm'>
							<EmptyState.Header>
								<EmptyState.Title>等待查询</EmptyState.Title>
								<EmptyState.Description>
									输入 entity type 和 entity id 后即可读取该实体的 Activity timeline。
								</EmptyState.Description>
							</EmptyState.Header>
						</EmptyState>
					) : null}

					{loadState.kind === 'loading' ? (
						<Alert aria-busy='true' aria-live='polite' role='status' status='accent'>
							<Alert.Indicator>
								<Spinner aria-hidden='true' color='current' size='sm' />
							</Alert.Indicator>
							<Alert.Content>
								<Alert.Title>读取中</Alert.Title>
								<Alert.Description>正在向 Rust 宿主请求 Activity timeline。</Alert.Description>
							</Alert.Content>
						</Alert>
					) : null}

					{loadState.kind === 'error' ? (
						<Alert role='alert' status='danger'>
							<Alert.Indicator />
							<Alert.Content>
								<Alert.Title>查询失败</Alert.Title>
								<Alert.Description>{loadState.message}</Alert.Description>
							</Alert.Content>
						</Alert>
					) : null}

					{loadState.kind === 'ready' && loadState.entries.length === 0 ? (
						<EmptyState size='sm'>
							<EmptyState.Header>
								<EmptyState.Title>暂无记录</EmptyState.Title>
								<EmptyState.Description>
									当前实体还没有任何 Activity 记录，或者你输入的 entity id 不存在。
								</EmptyState.Description>
							</EmptyState.Header>
						</EmptyState>
					) : null}

					{loadState.kind === 'ready' && loadState.entries.length > 0 ? (
						<div className='divide-y divide-separator'>
							{loadState.entries.map((entry) => (
								<article className='space-y-3 py-4 first:pt-0 last:pb-0' key={entry.id}>
									<div className='flex flex-wrap items-center gap-2 text-xs text-muted'>
										<span className='font-medium text-foreground'>{entry.action}</span>
										<span>{entry.entityType}</span>
										<span>{entry.entityId}</span>
										<span>{entry.actorType}</span>
										<span>{entry.source}</span>
										<span className='tabular-nums'>{entry.createdAt}</span>
									</div>

									{entry.summary ? (
										<p className='text-sm leading-6 text-foreground'>{entry.summary}</p>
									) : null}

									{entry.metadata ? (
										<div className='space-y-1.5'>
											<p className='text-xs font-medium text-muted'>Metadata</p>
											<pre className='overflow-x-auto rounded-lg bg-surface-secondary p-3 text-xs leading-5 text-muted'>
												{JSON.stringify(entry.metadata, null, 2)}
											</pre>
										</div>
									) : null}

									<details className='border-l border-separator pl-3'>
										<summary className='cursor-pointer text-sm font-medium text-foreground'>
											字段变化 ({entry.changes.length})
										</summary>
										{entry.changes.length === 0 ? (
											<p className='mt-3 text-sm text-muted'>这条事件没有附带字段变化。</p>
										) : (
											<div className='mt-3 space-y-3'>
												{entry.changes.map((change) => (
													<div className='border-l border-separator pl-3' key={change.id}>
														<div className='flex flex-wrap items-center gap-2 text-xs text-muted'>
															<span className='font-medium text-foreground'>{change.field}</span>
															<span className='tabular-nums'>{change.createdAt}</span>
														</div>
														<div className='mt-2 grid gap-2 md:grid-cols-2'>
															<pre className='overflow-x-auto rounded-md bg-surface-secondary p-2 text-xs leading-5 text-muted'>
																{JSON.stringify(change.oldValue, null, 2)}
															</pre>
															<pre className='overflow-x-auto rounded-md bg-surface-secondary p-2 text-xs leading-5 text-muted'>
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
				</div>
			</PageFrame.Body>
		</PageFrame.Root>
	)
}
