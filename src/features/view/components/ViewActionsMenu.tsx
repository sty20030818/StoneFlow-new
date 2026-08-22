import { Button, Dropdown } from '@heroui/react'
import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react'

import { ActionTooltip } from '@/shared/components/tooltip'
import type { View } from '@/shared/types'

type ViewActionsMenuProps = {
	activeView: View
	onEdit?: (view: View) => void
	onDelete: (view: View) => void
}

export function ViewActionsMenu({ activeView, onEdit, onDelete }: ViewActionsMenuProps) {
	return (
		<Dropdown>
			<ActionTooltip label='视图操作'>
				<Button aria-label='视图操作' isIconOnly size='sm' type='button' variant='outline'>
					<EllipsisIcon className='size-4' />
				</Button>
			</ActionTooltip>
			<Dropdown.Popover placement='bottom end'>
				<Dropdown.Menu aria-label='视图操作'>
					{onEdit ? (
						<Dropdown.Item
							id='edit-view'
							onAction={() => onEdit(activeView)}
							textValue='编辑保存视图'
						>
							<PencilIcon />
							编辑保存视图
						</Dropdown.Item>
					) : null}
					<Dropdown.Item
						id='delete-view'
						onAction={() => onDelete(activeView)}
						textValue='删除保存视图'
						variant='danger'
					>
						<Trash2Icon />
						删除保存视图
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
