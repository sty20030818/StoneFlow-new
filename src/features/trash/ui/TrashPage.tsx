import { useParams } from 'react-router-dom'

import { useTrashEntries } from '@/features/trash/model/useTrashEntries'
import type { TrashEntry } from '@/features/trash/model/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'

export function TrashPage() {
	const { spaceId = 'default' } = useParams()
	const { entries, isLoading, loadError, feedback, pendingEntryId, refresh, restoreEntry } =
		useTrashEntries(spaceId)

	return (
		<div className='p-4'>
			<PanelSurface
				actions={
					<Button className='rounded-xl' onClick={() => void refresh()} size='sm' variant='outline'>
						刷新
					</Button>
				}
				eyebrow='Trash'
				title='回收站'
			>
				<div className='flex flex-col gap-3'>
					{feedback ? (
						<p
							className='rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-700'
							role='status'
						>
							{feedback}
						</p>
					) : null}

					{loadError ? (
						<p
							className='rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'
							role='alert'
						>
							{loadError}
						</p>
					) : null}

					{isLoading ? (
						<p className='text-sm text-muted-foreground' role='status'>
							正在加载回收站...
						</p>
					) : entries.length === 0 ? (
						<div className='flex flex-col items-start gap-2 rounded-xl border border-dashed border-border/70 bg-background px-4 py-6'>
							<Trash2Icon className='size-5 text-muted-foreground' />
							<p className='text-sm font-medium text-foreground'>回收站为空</p>
							<p className='text-sm text-muted-foreground'>
								删除后的 Task 和 Project 会在这里等待恢复。
							</p>
						</div>
					) : (
						entries.map((entry) => (
							<TrashEntryRow
								entry={entry}
								isPending={pendingEntryId === entry.id}
								key={entry.id}
								onRestore={restoreEntry}
							/>
						))
					)}
				</div>
			</PanelSurface>
		</div>
	)
}

type TrashEntryRowProps = {
	entry: TrashEntry
	isPending: boolean
	onRestore: (entry: TrashEntry) => Promise<void>
}

function TrashEntryRow({ entry, isPending, onRestore }: TrashEntryRowProps) {
	return (
		<div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3'>
			<div className='flex min-w-0 flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<Badge variant={entry.entityType === 'task' ? 'secondary' : 'outline'}>
						{entry.entityType === 'task' ? 'Task' : 'Project'}
					</Badge>
					<p className='text-sm font-medium text-foreground'>{entry.title}</p>
				</div>
				<p className='text-xs text-muted-foreground'>
					删除于 {formatDeletedAt(entry.deletedAt)}
					{entry.deletedFrom ? ` · 来源 ${entry.deletedFrom}` : ''}
				</p>
				<p className='text-xs text-muted-foreground'>{entry.restoreHint}</p>
			</div>
			<div className='flex flex-wrap items-center gap-2'>
				<Badge variant='outline'>可恢复</Badge>
				<Button
					disabled={isPending}
					onClick={() => void onRestore(entry)}
					size='sm'
					variant='secondary'
				>
					<RotateCcwIcon data-icon='inline-start' />
					{isPending ? '恢复中...' : '恢复'}
				</Button>
			</div>
		</div>
	)
}

function formatDeletedAt(value: string) {
	return new Date(value).toLocaleString('zh-CN')
}
