import type { Space } from '@/shared/types'

import { Button, Dropdown, Modal } from '@heroui/react'
import { useId } from 'react'

import {
	createSpaceMetadataDropdownProps,
	getSpaceMetadataButtonVisual,
} from '@/features/metadata-fields'
import { ActionTooltip } from '@/shared/components/tooltip'
import type { CreateModalHeaderProps } from '@/shared/components/create-modal-content'
import { cn } from '@/shared/lib/utils'
import { CheckIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, XIcon } from 'lucide-react'

type CreateDialogShellProps = {
	open: boolean
	/** 弹窗标题，如 "新建任务"、"新建项目" */
	title: string
	/** 无障碍描述 */
	description: string
	fullscreen?: boolean
	onClose: () => void
	children: React.ReactNode
}

/**
 * 创建弹窗容器；Header 由领域表单通过组合槽接入同一份归属状态。
 */
export function CreateDialogShell({
	open,
	title,
	description,
	fullscreen = false,
	onClose,
	children,
}: CreateDialogShellProps) {
	const descriptionId = useId()

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<Modal.Container placement='top' size='lg' data-create-dialog-container>
				<Modal.Dialog
					aria-describedby={descriptionId}
					data-create-dialog
					className={cn(
						'w-[calc(100vw-2rem)] max-w-3xl overflow-hidden',
						fullscreen && 'h-full max-w-6xl',
					)}
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								// Tab 必须到达 React Aria 的 document 监听，才能在首尾回绕焦点。
								if (event.key === 'Tab') return
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<Modal.Heading className='sr-only'>{title}</Modal.Heading>
					<p className='sr-only' id={descriptionId}>
						{description}
					</p>

					<div className='flex min-h-0 flex-1 flex-col'>{children}</div>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

export function CreateDialogHeader({
	title,
	spaces,
	selectedSpaceId,
	onSelectSpace,
	disabled,
	fullscreen = false,
	onToggleFullscreen,
	onClose,
}: CreateModalHeaderProps & {
	title: string
	spaces: Space[]
	fullscreen?: boolean
	onToggleFullscreen?: () => void
	onClose: () => void
}) {
	const currentSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null
	// 创建必须落到具体 Space；空选中态不能伪装成「所有空间」聚合。
	const currentSpaceLabel = currentSpace?.name ?? '选择空间'

	return (
		<Modal.Header data-create-dialog-header>
			<div className='flex w-full shrink-0 items-center justify-between gap-3'>
				<div className='flex min-w-0 items-center gap-1.5 text-[13px]'>
					<CreateDialogSpaceSelector
						currentSpace={currentSpace}
						currentSpaceLabel={currentSpaceLabel}
						disabled={disabled}
						onSelectSpace={onSelectSpace}
						selectedSpaceId={selectedSpaceId}
						spaces={spaces}
					/>
					<ChevronRightIcon className='size-3.5 shrink-0 text-muted' />
					<span className='truncate font-semibold text-foreground'>{title}</span>
				</div>

				<div className='flex shrink-0 items-center gap-3'>
					{onToggleFullscreen ? (
						<ActionTooltip label={fullscreen ? '退出全屏创建' : '全屏创建'}>
							<Button
								aria-label={fullscreen ? '退出全屏创建' : '全屏创建'}
								isIconOnly
								onPress={onToggleFullscreen}
								size='sm'
								type='button'
								variant='ghost'
							>
								{fullscreen ? (
									<Minimize2Icon className='size-3.5' />
								) : (
									<Maximize2Icon className='size-3.5' />
								)}
							</Button>
						</ActionTooltip>
					) : null}
					<ActionTooltip label='关闭创建窗口'>
						<Button
							aria-label='关闭创建窗口'
							isIconOnly
							onPress={onClose}
							size='sm'
							type='button'
							variant='ghost'
						>
							<XIcon className='size-3.5' />
						</Button>
					</ActionTooltip>
				</div>
			</div>
		</Modal.Header>
	)
}

function CreateDialogSpaceSelector({
	currentSpace,
	currentSpaceLabel,
	selectedSpaceId,
	spaces,
	disabled,
	onSelectSpace,
}: {
	currentSpace: Space | null
	currentSpaceLabel: string
	selectedSpaceId: string
	spaces: Space[]
	disabled: boolean
	onSelectSpace: (spaceId: string) => void
}) {
	const spaceDropdownProps = createSpaceMetadataDropdownProps(spaces)
	const buttonVisual = getSpaceMetadataButtonVisual(currentSpace)

	return (
		<Dropdown>
			<Button
				aria-label='空间'
				className='max-w-52'
				isDisabled={disabled}
				size='sm'
				type='button'
				variant='outline'
			>
				{buttonVisual.icon}
				<span className='min-w-0 truncate'>{currentSpaceLabel}</span>
			</Button>
			<Dropdown.Popover offset={6} placement='bottom start'>
				<Dropdown.Menu aria-label={spaceDropdownProps.menuLabel}>
					{spaceDropdownProps.options.map((option) => (
						<Dropdown.Item
							id={option.key ?? option.value}
							isDisabled={option.disabled}
							key={option.key ?? option.value}
							onAction={() => onSelectSpace(option.value)}
							textValue={option.label}
						>
							{option.icon}
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{option.value === selectedSpaceId ? <CheckIcon className='ml-auto size-4' /> : null}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
