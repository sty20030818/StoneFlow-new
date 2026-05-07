import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import {
	CreatedAtCell,
	RestoreActionCell,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
} from '@/shared/ui/row'
import { entityBoardShellSecondaryIconClass } from '@/shared/ui/patterns/entity-board'
import { BoxIcon, FolderIcon, ListTodoIcon } from 'lucide-react'

type LifecycleRowAdapterProps = {
	entry: LifecycleEntry
	mode: LifecycleMode
	rowState: {
		isSelected: boolean
		isPending: boolean
	}
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
	actions,
}: LifecycleRowAdapterProps) {
	const Icon = getLifecycleEntityIcon(entry.entityType)
	const canOpenDetail = mode === 'archive' && typeof actions.onOpenDetail === 'function'
	const createdAtValue = mode === 'archive' ? entry.archivedAt : entry.deletedAt

	return (
		<RowShell.Root
			aria-label={canOpenDetail ? `打开 ${entry.title}` : undefined}
			className={canOpenDetail ? undefined : 'cursor-default'}
			data-lifecycle-entity={entry.entityType}
			interactive={canOpenDetail}
			pending={rowState.isPending}
			selected={rowState.isSelected}
			onClick={canOpenDetail ? () => actions.onOpenDetail?.(entry) : undefined}
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
			selectedClassName={TASK_ROW_BULK_SELECTED_CLASS}
		>
			<RowShell.Left>
				<RowShell.Leading>
					<RowSelectionCell
						ariaLabel={`选择 ${entry.title}`}
						checked={rowState.isSelected}
						disabled={rowState.isPending}
						onCheckedChange={actions.onToggleSelected}
					/>
				</RowShell.Leading>

				<RowShell.Icon className={entityBoardShellSecondaryIconClass}>
					<Icon className='size-4' />
				</RowShell.Icon>

				<RowShell.Title>
					<RowTitleCell title={entry.title} />
				</RowShell.Title>
			</RowShell.Left>

			<RowShell.Right>
				<RowShell.Fields>
					<CreatedAtCell value={createdAtValue} />
				</RowShell.Fields>
				<RowShell.Actions>
					<RestoreActionCell
						disabled={rowState.isPending}
						onRestore={() => actions.onRestore(entry)}
					/>
				</RowShell.Actions>
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
