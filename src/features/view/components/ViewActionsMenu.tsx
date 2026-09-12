import { Alert, Button, Dropdown } from '@heroui/react'
import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { ActionTooltip } from '@/shared/components/tooltip'
import { normalizeSubmitError } from '@/shared/form'
import type { View, ViewListItem } from '@/shared/types'

type ViewActionsMenuProps = {
	activeView: ViewListItem
	onEdit?: (view: View) => void
	onDelete: (view: ViewListItem) => Promise<void>
}

export function ViewActionsMenu({ activeView, onEdit, onDelete }: ViewActionsMenuProps) {
	const [open, setOpen] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const request = useRef<symbol | null>(null)
	const menuSession = useRef(0)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const errorId = useId()
	const [viewId, setViewId] = useState(activeView.id)
	if (viewId !== activeView.id) {
		setViewId(activeView.id)
		setOpen(false)
		setDeleting(false)
		setError(null)
	}

	useEffect(() => {
		return () => {
			request.current = null
			menuSession.current += 1
		}
	}, [activeView.id])

	const changeOpen = useCallback((nextOpen: boolean) => {
		menuSession.current += 1
		setOpen(nextOpen)
		if (!nextOpen) setError(null)
	}, [])

	useEffect(() => {
		if (!open) return
		// 缩窗可能把来源行移出视口；菜单不能继续锚定不可见的按钮。
		const closeIfTriggerHidden = () => {
			const rect = triggerRef.current?.getBoundingClientRect()
			if (
				rect &&
				(rect.bottom <= 0 ||
					rect.top >= window.innerHeight ||
					rect.right <= 0 ||
					rect.left >= window.innerWidth)
			) {
				changeOpen(false)
			}
		}
		window.addEventListener('resize', closeIfTriggerHidden)
		return () => window.removeEventListener('resize', closeIfTriggerHidden)
	}, [open, changeOpen])

	async function removeView() {
		if (request.current) return
		const currentRequest = Symbol('delete-view')
		const session = menuSession.current
		request.current = currentRequest
		setDeleting(true)
		setError(null)
		try {
			await onDelete(activeView)
			if (request.current === currentRequest && menuSession.current === session) changeOpen(false)
		} catch (error) {
			if (request.current === currentRequest && menuSession.current === session) {
				setError(normalizeSubmitError(error, '删除失败，请重试。'))
			}
		} finally {
			if (request.current === currentRequest) {
				request.current = null
				setDeleting(false)
			}
		}
	}

	return (
		<Dropdown isOpen={open} onOpenChange={changeOpen}>
			<ActionTooltip label='视图操作'>
				<Button
					ref={triggerRef}
					aria-label='视图操作'
					isIconOnly
					size='sm'
					type='button'
					variant='outline'
				>
					<EllipsisIcon className='size-4' />
				</Button>
			</ActionTooltip>
			<Dropdown.Popover className='max-w-[calc(100vw-16px)]' placement='bottom end'>
				<Dropdown.Menu
					aria-describedby={error ? errorId : undefined}
					aria-label='视图操作'
					shouldCloseOnSelect={false}
				>
					{onEdit && activeView.definitionError == null ? (
						<Dropdown.Item
							id='edit-view'
							isDisabled={deleting}
							onAction={() => {
								changeOpen(false)
								onEdit(activeView)
							}}
							textValue='编辑保存视图'
						>
							<PencilIcon />
							编辑保存视图
						</Dropdown.Item>
					) : null}
					<Dropdown.Item
						id='delete-view'
						isDisabled={deleting}
						onAction={() => void removeView()}
						textValue={error ? '重试删除' : '删除保存视图'}
						variant='danger'
					>
						<Trash2Icon />
						{deleting ? '正在删除…' : error ? '重试删除' : '删除保存视图'}
					</Dropdown.Item>
				</Dropdown.Menu>
				{error ? (
					<Alert className='mx-1 mb-1 max-w-64' id={errorId} role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content className='min-w-0'>
							<Alert.Title>删除失败</Alert.Title>
							<Alert.Description className='wrap-anywhere'>{error}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}
			</Dropdown.Popover>
		</Dropdown>
	)
}
