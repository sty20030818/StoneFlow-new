import type { ReactNode } from 'react'

import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'

type LifecycleEntitySectionProps = {
	title: string
	mode: LifecycleMode
	entries: LifecycleEntry[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	error: string | null
	pendingEntryId: string | null
	onRestore: (entry: LifecycleEntry) => void
	onDeleteFromArchive?: (entry: LifecycleEntry) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
}

export function LifecycleEntitySection({
	title,
	mode,
	entries,
	status,
	error,
	pendingEntryId,
	onRestore,
	onDeleteFromArchive,
	onPermanentlyDelete,
	onOpenDetail,
}: LifecycleEntitySectionProps) {
	return (
		<section className='flex flex-col gap-2 rounded-xl border border-(--sf-color-border-subtle) bg-background p-3'>
			<div className='flex items-center justify-between gap-3'>
				<div className='flex min-w-0 items-center gap-2'>
					<h2 className='text-sm font-semibold text-foreground'>{title}</h2>
					<span className='rounded-full bg-(--sf-color-bg-surface-hover) px-2 py-0.5 text-[11px] text-(--sf-color-text-secondary)'>
						{entries.length}
					</span>
				</div>
				{status === 'loading' ? (
					<span className='text-xs text-(--sf-color-text-tertiary)'>加载中...</span>
				) : null}
			</div>

			{status === 'error' && error ? (
				<div className='rounded-lg border border-[#f2c8cf] bg-[#fff7f8] px-3 py-2 text-xs text-[#c44c61]'>
					{error}
				</div>
			) : null}

			{entries.length === 0 ? (
				<div className='rounded-lg border border-dashed border-(--sf-color-border-subtle) px-3 py-5 text-sm text-(--sf-color-text-tertiary)'>
					{mode === 'archive' ? '当前分区没有归档条目。' : '当前分区没有已删除条目。'}
				</div>
			) : (
				<div className='flex flex-col gap-2'>
					{entries.map((entry) => {
						const isPending = pendingEntryId === entry.id
						return (
							<div
								className='flex flex-col gap-3 rounded-lg border border-(--sf-color-border-subtle) px-3 py-3'
								key={entry.id}
							>
								<div className='flex items-start justify-between gap-3'>
									<div className='min-w-0 flex-1'>
										<div className='truncate text-sm font-medium text-foreground'>
											{entry.title}
										</div>
										<div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-(--sf-color-text-secondary)'>
											<InlineMeta label='Space' value={entry.spaceName ?? '未关联 Space'} />
											{entry.entityType === 'task' ? (
												<InlineMeta
													label='Project'
													value={entry.projectName ?? 'Inbox / No Project'}
												/>
											) : null}
											<InlineMeta
												label={mode === 'archive' ? '归档时间' : '删除时间'}
												value={
													mode === 'archive' ? (entry.archivedAt ?? '-') : (entry.deletedAt ?? '-')
												}
											/>
										</div>
									</div>
									<div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
										<Button
											disabled={isPending}
											onClick={() => onRestore(entry)}
											size='sm'
											type='button'
											variant='outline'
										>
											恢复
										</Button>
										{mode === 'archive' && onDeleteFromArchive ? (
											<Button
												disabled={isPending}
												onClick={() => onDeleteFromArchive(entry)}
												size='sm'
												type='button'
												variant='outline'
											>
												删除
											</Button>
										) : null}
										{mode === 'trash' && onPermanentlyDelete ? (
											<Button
												disabled={isPending}
												onClick={() => onPermanentlyDelete(entry)}
												size='sm'
												type='button'
												variant='outline'
											>
												永久删除
											</Button>
										) : null}
										{mode === 'archive' && onOpenDetail ? (
											<Button
												disabled={isPending}
												onClick={() => onOpenDetail(entry)}
												size='sm'
												type='button'
												variant='ghost'
											>
												打开详情
											</Button>
										) : null}
									</div>
								</div>

								<div className='text-xs leading-5 text-(--sf-color-text-tertiary)'>
									{buildHintLine(entry)}
								</div>
							</div>
						)
					})}
				</div>
			)}
		</section>
	)
}

function InlineMeta({ label, value }: { label: string; value: ReactNode }) {
	return (
		<span className='inline-flex items-center gap-1'>
			<span className='text-(--sf-color-text-tertiary)'>{label}</span>
			<span className='text-(--sf-color-text-secondary)'>{value}</span>
		</span>
	)
}

function buildHintLine(entry: LifecycleEntry) {
	const sourceText =
		entry.sourceType && entry.sourceId
			? `来源：${entry.sourceType} / ${entry.sourceId}`
			: '来源：当前记录自身'
	return `${entry.restoreHint} ${sourceText}`
}
