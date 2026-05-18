import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import {
	CreatedAtCell,
	IconCell,
	RestoreActionCell,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	type RowSelectionGroupPosition,
} from '@/shared/ui/row'
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
	selectionGroupPosition?: RowSelectionGroupPosition
	actions: {
		onToggleSelected: () => void
		onRestore: (entry: LifecycleEntry) => void
		onOpenDetail?: (entry: LifecycleEntry) => void
	}
}

/**
 * LifecycleRowAdapter 负责生命周期实体到统一 RowShell 的语义翻译。
 * 当前阶段常驻动作只保留恢复，其余动作不进入 row 主界面。
 */
export function LifecycleRowAdapter({
	entry,
	mode,
	rowState,
	rowShortcutHandlers,
	selectionGroupPosition,
	actions,
}: LifecycleRowAdapterProps) {
	const Icon = getLifecycleEntityIcon(entry.entityType)
	const canOpenDetail = mode === 'archive' && typeof actions.onOpenDetail === 'function'
	const createdAtValue = mode === 'archive' ? entry.archivedAt : entry.deletedAt
	const isHovered = rowState.isHovered ?? false
	const hoverSource = rowState.hoverSource ?? null

	return (
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
						ariaLabel={`选择 ${entry.title}`}
						checked={rowState.isSelected}
						disabled={rowState.isPending}
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
