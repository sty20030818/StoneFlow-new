import { Button, Dropdown } from '@heroui/react'
import { EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { ActionTooltip } from '@/shared/components/tooltip'
import type { View } from '@/shared/types'

type ViewActionsMenuProps = {
	activeView: View | null
	onCreate: () => void
	onEdit: (view: View) => void
	onDelete: (view: View) => void
}

export function ViewActionsMenu({ activeView, onCreate, onEdit, onDelete }: ViewActionsMenuProps) {
	const canMutateActiveView = activeView?.kind === 'custom'

	return (
		<Dropdown>
			<ActionTooltip label='视图操作'>
				<Button aria-label='视图操作' isIconOnly size='sm' type='button' variant='outline'>
					<EllipsisIcon className='size-4' />
				</Button>
			</ActionTooltip>
			<Dropdown.Popover placement='bottom end'>
				<Dropdown.Menu aria-label='视图操作'>
					<Dropdown.Item id='create-view' onAction={onCreate} textValue='新建自定义视图'>
						<PlusIcon />
						新建自定义视图
					</Dropdown.Item>
					{canMutateActiveView ? (
						<Dropdown.Item
							id='edit-view'
							onAction={() => onEdit(activeView)}
							textValue='编辑当前视图'
						>
							<PencilIcon />
							编辑当前视图
						</Dropdown.Item>
					) : null}
					{canMutateActiveView ? (
						<Dropdown.Item
							id='delete-view'
							onAction={() => onDelete(activeView)}
							textValue='删除当前视图'
							variant='danger'
						>
							<Trash2Icon />
							删除当前视图
						</Dropdown.Item>
					) : null}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
