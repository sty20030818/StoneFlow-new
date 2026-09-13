import { ContextMenu } from '@heroui-pro/react'
import { CheckCheckIcon, ChevronsDownUpIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'

type BoardSectionContextMenuProps = {
	open: boolean
	selectedAll: boolean
	selectionDisabled?: boolean
	selectionScope?: 'all' | 'loaded'
	onCollapse: () => void
	onExpand: () => void
	onCollapseAll: () => void
	onExpandAll: () => void
	onSelectAll: () => void
	onDeselectAll: () => void
}

export function BoardSectionContextMenu({
	open,
	selectedAll,
	selectionDisabled = false,
	selectionScope = 'all',
	onCollapse,
	onExpand,
	onCollapseAll,
	onExpandAll,
	onSelectAll,
	onDeselectAll,
}: BoardSectionContextMenuProps) {
	const selectLabel = selectionScope === 'loaded' ? '选中已加载任务' : '选中全部'
	const deselectLabel = selectionScope === 'loaded' ? '取消选中已加载任务' : '取消选中全部'
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
				{selectedAll ? (
					<ContextMenu.Item
						id='toggle-section-selection'
						isDisabled={selectionDisabled}
						onAction={onDeselectAll}
						textValue={deselectLabel}
					>
						<XIcon />
						{deselectLabel}
					</ContextMenu.Item>
				) : (
					<ContextMenu.Item
						id='toggle-section-selection'
						isDisabled={selectionDisabled}
						onAction={onSelectAll}
						textValue={selectLabel}
					>
						<CheckCheckIcon />
						{selectLabel}
					</ContextMenu.Item>
				)}
			</ContextMenu.Menu>
		</ContextMenu.Popover>
	)
}
