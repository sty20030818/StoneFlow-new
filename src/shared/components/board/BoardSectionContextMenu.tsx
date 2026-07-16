import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from '@/shared/components/base/context-menu'
import { CheckCheckIcon, ChevronsDownUpIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'

type BoardSectionContextMenuProps = {
	open: boolean
	selectedCount: number
	onCollapse: () => void
	onExpand: () => void
	onCollapseAll: () => void
	onExpandAll: () => void
	onSelectAll: () => void
	onDeselectAll: () => void
}

export function BoardSectionContextMenu({
	open,
	selectedCount,
	onCollapse,
	onExpand,
	onCollapseAll,
	onExpandAll,
	onSelectAll,
	onDeselectAll,
}: BoardSectionContextMenuProps) {
	return (
		<ContextMenuContent>
			{open ? (
				<>
					<ContextMenuItem onClick={onCollapse}>折叠该分区</ContextMenuItem>
					<ContextMenuItem onClick={onCollapseAll}>
						<ChevronsDownUpIcon />
						折叠全部
					</ContextMenuItem>
				</>
			) : (
				<>
					<ContextMenuItem onClick={onExpand}>展开该分区</ContextMenuItem>
					<ContextMenuItem onClick={onExpandAll}>
						<ChevronsUpDownIcon />
						展开全部
					</ContextMenuItem>
				</>
			)}
			<ContextMenuSeparator />
			{selectedCount >= 2 ? (
				<ContextMenuItem onClick={onDeselectAll}>
					<XIcon />
					取消选中全部
				</ContextMenuItem>
			) : (
				<ContextMenuItem onClick={onSelectAll}>
					<CheckCheckIcon />
					选中全部
				</ContextMenuItem>
			)}
		</ContextMenuContent>
	)
}
