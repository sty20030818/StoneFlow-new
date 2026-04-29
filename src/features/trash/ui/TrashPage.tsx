import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { LINEAR_CARD_BASE_CLASS, LINEAR_CARD_IDLE_CLASS } from '@/shared/ui/linearSurface'
import { Trash2Icon } from 'lucide-react'
import {
	SHELL_TRASH_ENTRIES,
	type ShellTrashEntry,
} from '@/features/workspace-shell/model/shellData'

export function TrashPage() {
	const { spaceId = 'work' } = useParams()
	const [entries, setEntries] = useState(SHELL_TRASH_ENTRIES)
	const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)
	const [bannerMessage, setBannerMessage] = useState(
		'Trash 页面保留了列表卡片与恢复按钮外观，数据来自本地 mock。',
	)

	function restoreEntry(entry: ShellTrashEntry) {
		setPendingEntryId(entry.id)

		window.setTimeout(() => {
			setEntries((currentEntries) =>
				currentEntries.filter((currentEntry) => currentEntry.id !== entry.id),
			)
			setPendingEntryId(null)
			setBannerMessage(`已从本地 mock 回收站恢复「${entry.title}」。`)
		}, 260)
	}

	return (
		<MainCardLayout
			header={<MainCardHeader title='Trash' />}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						setEntries(SHELL_TRASH_ENTRIES)
						setBannerMessage('已刷新本地 mock 回收站数据。')
					}}
					pills={[
						{ label: 'All deleted', active: true },
						{ label: 'Tasks' },
						{ label: 'Projects' },
					]}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<StatusNotice className='mb-3' size='sm'>
					{bannerMessage}
				</StatusNotice>

				<div className='flex min-h-0 flex-1 flex-col'>
					{entries.length === 0 ? (
						<EmptyPage>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<Trash2Icon />
									</EmptyMedia>
									<EmptyTitle>回收站为空</EmptyTitle>
									<EmptyDescription>删除后的 Task 和 Project 会在这里等待恢复。</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<Button asChild>
										<Link to={`/space/${spaceId}/inbox`}>返回 Inbox</Link>
									</Button>
								</EmptyContent>
							</Empty>
						</EmptyPage>
					) : (
						<div className='flex min-h-0 flex-1 flex-col gap-3'>
							{entries.map((entry) => (
								<TrashEntryRow
									entry={entry}
									isPending={pendingEntryId === entry.id}
									key={entry.id}
									onRestore={restoreEntry}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</MainCardLayout>
	)
}

type TrashEntryRowProps = {
	entry: ShellTrashEntry
	isPending: boolean
	onRestore: (entry: ShellTrashEntry) => void
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
					onClick={() => onRestore(entry)}
					size='sm'
					variant='secondary'
				>
					{isPending ? '恢复中...' : '恢复'}
				</Button>
			</div>
		</div>
	)
}

function formatDeletedAt(value: string) {
	return new Date(value).toLocaleString('zh-CN')
}
