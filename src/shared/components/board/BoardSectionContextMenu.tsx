import { ContextMenu } from '@heroui-pro/react'
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
		<ContextMenu.Popover className='w-52'>
			<ContextMenu.Menu aria-label='分区操作'>
				{open ? (
					<>
						<ContextMenu.Item id='toggle-section' onAction={onCollapse} textValue='折叠该分区'>
							折叠该分区
						</ContextMenu.Item>
						<ContextMenu.Item
							id='toggle-all-sections'
							onAction={onCollapseAll}
							textValue='折叠全部'
						>
							<ChevronsDownUpIcon />
							折叠全部
						</ContextMenu.Item>
					</>
				) : (
					<>
						<ContextMenu.Item id='toggle-section' onAction={onExpand} textValue='展开该分区'>
							展开该分区
						</ContextMenu.Item>
						<ContextMenu.Item id='toggle-all-sections' onAction={onExpandAll} textValue='展开全部'>
							<ChevronsUpDownIcon />
							展开全部
						</ContextMenu.Item>
					</>
				)}
				<ContextMenu.Separator />
				{selectedCount >= 2 ? (
					<ContextMenu.Item
						id='toggle-section-selection'
						onAction={onDeselectAll}
						textValue='取消选中全部'
					>
						<XIcon />
						取消选中全部
					</ContextMenu.Item>
				) : (
					<ContextMenu.Item
						id='toggle-section-selection'
						onAction={onSelectAll}
						textValue='选中全部'
					>
						<CheckCheckIcon />
						选中全部
					</ContextMenu.Item>
				)}
			</ContextMenu.Menu>
		</ContextMenu.Popover>
	)
}
