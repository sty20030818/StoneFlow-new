import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { LifecycleContextMenu } from './LifecycleContextMenu'
import {
	CreatedAtCell,
	IconCell,
	RestoreActionCell,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	type RowSelectionGroupPosition,
} from '@/shared/components/row'
import { BoxIcon, FolderIcon, ListTodoIcon } from 'lucide-react'

type LifecycleRowAdapterProps = {
	entry: LifecycleEntry
	mode: LifecycleMode
	rowState: {
		isSelected: boolean
		isPending: boolean
		isHovered?: boolean
		hoverSource?: 'pointer' | 'keyboard' | null
	}
	rowShortcutHandlers?: {
		onHover: (entryId: string | null) => void
	}
	contextEntries?: LifecycleEntry[]
	selectionGroupPosition?: RowSelectionGroupPosition
	actions: {
		onToggleSelected: () => void
		onRestore: (entry: LifecycleEntry) => void
		onRestoreEntries?: (entries: LifecycleEntry[]) => void
		onOpenDetail?: (entry: LifecycleEntry) => void
		onMoveToTrash?: (entry: LifecycleEntry) => void
		onMoveToTrashEntries?: (entries: LifecycleEntry[]) => void
		onPermanentlyDelete?: (entry: LifecycleEntry) => void
		onPermanentlyDeleteEntries?: (entries: LifecycleEntry[]) => void
	}
}

/**
 * LifecycleRowAdapter 负责生命周期实体到统一 RowShell 的语义翻译。
 * 行内主操作只保留恢复，其余动作不进入 Row 主界面。
 */
export function LifecycleRowAdapter({
	entry,
	mode,
	rowState,
	rowShortcutHandlers,
	contextEntries,
	selectionGroupPosition,
	actions,
}: LifecycleRowAdapterProps) {
	const Icon = getLifecycleEntityIcon(entry.entityType)
	const targetEntries = contextEntries && contextEntries.length > 0 ? contextEntries : [entry]
	const isBulkContext = targetEntries.length > 1
	const canOpenDetail =
		!isBulkContext &&
		mode === 'archive' &&
		entry.entityType !== 'project' &&
		typeof actions.onOpenDetail === 'function'
	const createdAtValue = mode === 'archive' ? entry.archivedAt : entry.deletedAt
	const isHovered = rowState.isHovered ?? false
	const hoverSource = rowState.hoverSource ?? null

	return (
		<LifecycleContextMenu
			entityLabel={entry.title}
			entityType={entry.entityType}
			isBusy={rowState.isPending}
			onMoveToTrash={
				mode === 'archive'
					? () => {
							if (isBulkContext) {
								actions.onMoveToTrashEntries?.(targetEntries)
								return
							}
							actions.onMoveToTrash?.(entry)
						}
					: undefined
			}
			onOpenDetail={canOpenDetail ? () => actions.onOpenDetail?.(entry) : undefined}
			onPermanentlyDelete={
				mode === 'trash'
					? () => {
							if (isBulkContext) {
								actions.onPermanentlyDeleteEntries?.(targetEntries)
								return
							}
							actions.onPermanentlyDelete?.(entry)
						}
					: undefined
			}
			onRestore={() => {
				if (isBulkContext) {
					actions.onRestoreEntries?.(targetEntries)
					return
				}
				actions.onRestore(entry)
			}}
			targetCount={targetEntries.length}
		>
			<RowShell.Root
				aria-label={canOpenDetail ? `打开 ${entry.title}` : undefined}
				className={canOpenDetail ? undefined : 'cursor-default'}
				data-lifecycle-entity={entry.entityType}
				interactive={canOpenDetail}
				hovered={isHovered}
				hoverSource={hoverSource}
				pending={rowState.isPending}
				selected={rowState.isSelected}
				selectionGroupPosition={selectionGroupPosition}
				onClick={canOpenDetail ? () => actions.onOpenDetail?.(entry) : undefined}
				onMouseEnter={() => rowShortcutHandlers?.onHover(entry.id)}
				onMouseLeave={() => rowShortcutHandlers?.onHover(null)}
				onKeyDown={
					canOpenDetail
						? (event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault()
									actions.onOpenDetail?.(entry)
								}
							}
						: undefined
				}
			>
				<RowShell.Left>
					<RowShell.Leading>
						<RowSelectionCell
							checked={rowState.isSelected}
							disabled={rowState.isPending}
							disabledReason='正在处理该条目，暂时无法更改选择'
							label={`选择 ${entry.title}`}
							visible={rowState.isSelected || isHovered}
							onCheckedChange={actions.onToggleSelected}
						/>
					</RowShell.Leading>

					<IconCell icon={<Icon className='size-4' />} />

					<RowShell.Title>
						<RowTitleCell title={entry.title} />
					</RowShell.Title>
				</RowShell.Left>

				<RowShell.Right>
					<RowShell.Actions>
						<RestoreActionCell
							disabled={rowState.isPending}
							onRestore={() => actions.onRestore(entry)}
						/>
					</RowShell.Actions>
					<RowShell.Fields>
						<CreatedAtCell value={createdAtValue} />
					</RowShell.Fields>
				</RowShell.Right>
			</RowShell.Root>
		</LifecycleContextMenu>
	)
}

function getLifecycleEntityIcon(entityType: LifecycleEntry['entityType']) {
	switch (entityType) {
		case 'space':
			return FolderIcon
		case 'project':
			return BoxIcon
		default:
			return ListTodoIcon
	}
}

export type { LifecycleRowAdapterProps }
