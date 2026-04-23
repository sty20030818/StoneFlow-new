import { useParams } from 'react-router-dom'

import { useTrashEntries } from '@/features/trash/model/useTrashEntries'
import type { TrashEntry } from '@/features/trash/model/types'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import {
	LINEAR_CARD_BASE_CLASS,
	LINEAR_CARD_IDLE_CLASS,
	LINEAR_EMPTY_STATE_CLASS,
} from '@/shared/ui/linearSurface'
import { RefreshCwIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'

export function TrashPage() {
	const { spaceId = 'default' } = useParams()
	const { entries, isLoading, loadError, feedback, pendingEntryId, refresh, restoreEntry } =
		useTrashEntries(spaceId)

	return (
		<div className='p-4'>
			<PanelSurface
				actions={
					<Button
						aria-label='刷新回收站'
						onClick={() => void refresh()}
						size='icon-sm'
						variant='outline'
					>
						<RefreshCwIcon />
					</Button>
				}
				description='删除后的 Task 和 Project 会先进入这里，恢复后会回到原来的执行位置。'
				eyebrow='Trash'
				title='回收站'
			>
				<div className='flex flex-col gap-3'>
					{feedback ? (
						<StatusNotice className='text-sm' role='status' size='sm' variant='success'>
							{feedback}
						</StatusNotice>
					) : null}

					{loadError ? (
						<StatusNotice role='alert' variant='danger'>
							<p className='text-sm'>{loadError}</p>
						</StatusNotice>
					) : null}

					{isLoading ? (
						<p className='py-8 text-sm text-muted-foreground' role='status'>
							正在加载回收站...
						</p>
					) : entries.length === 0 ? (
						<div
							className={cn(LINEAR_EMPTY_STATE_CLASS, 'flex flex-col items-start gap-2 px-4 py-6')}
						>
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
		<div
			className={cn(
				LINEAR_CARD_BASE_CLASS,
				'flex flex-wrap items-center justify-between gap-3',
				LINEAR_CARD_IDLE_CLASS,
			)}
		>
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
					className='rounded-md'
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
