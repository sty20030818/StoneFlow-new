import type { Space } from '@/shared/types'

import { Button, Dropdown, Modal } from '@heroui/react'
import { useId } from 'react'

import {
	createSpaceMetadataDropdownProps,
	getSpaceMetadataButtonVisual,
} from '@/features/metadata-fields'
import { ActionTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'
import { CheckIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, XIcon } from 'lucide-react'

type CreateDialogShellProps = {
	open: boolean
	/** 弹窗标题，如 "新建任务"、"新建项目" */
	title: string
	/** 无障碍描述 */
	description: string
	spaces: Space[]
	selectedSpaceId: string | null
	fullscreen?: boolean
	showFullscreenToggle?: boolean
	onSelectSpace: (spaceId: string | null) => void
	onToggleFullscreen?: () => void
	onClose: () => void
	children: React.ReactNode
}

/**
 * 创建弹窗通用壳层 — 浮动 Dialog + Space 面包屑 Header。
 * 受控组件：selectedSpaceId 由父级管理，壳层只负责展示和转发。
 */
export function CreateDialogShell({
	open,
	title,
	description,
	spaces,
	selectedSpaceId,
	fullscreen = false,
	showFullscreenToggle = false,
	onSelectSpace,
	onToggleFullscreen,
	onClose,
	children,
}: CreateDialogShellProps) {
	const currentSpace = selectedSpaceId
		? (spaces.find((space) => space.id === selectedSpaceId) ?? null)
		: null
	const descriptionId = useId()
	// 创建必须落到具体 Space；空选中态提示选择，而不是伪装成「所有空间」聚合
	const currentSpaceLabel = currentSpace?.name ?? '选择空间'

	return (
		<Modal.Backdrop
			isKeyboardDismissDisabled={false}
			isOpen={open}
			onOpenChange={(nextOpen) => !nextOpen && onClose()}
		>
			<Modal.Container placement='center' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className={cn(
						'min-h-[30dvh] max-h-[70dvh] overflow-hidden',
						fullscreen &&
							'h-[70dvh] w-[min(72rem,calc(100vw-1.5rem))] max-w-[min(72rem,calc(100vw-1.5rem))]',
					)}
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<Modal.Heading className='sr-only'>{title}</Modal.Heading>
					<p className='sr-only' id={descriptionId}>
						{description}
					</p>

					<div className='flex shrink-0 items-center justify-between'>
						<div className='flex items-center gap-1 text-[13px]'>
							<CreateDialogSpaceSelector
								currentSpace={currentSpace}
								currentSpaceLabel={currentSpaceLabel}
								onSelectSpace={onSelectSpace}
								selectedSpaceId={selectedSpaceId}
								spaces={spaces}
							/>
							<ChevronRightIcon className='size-3.5 text-muted' />
							<span className='font-black text-foreground'>{title}</span>
						</div>

						<div className='flex items-center gap-0.5'>
							{showFullscreenToggle ? (
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

					<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>{children}</div>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

function CreateDialogSpaceSelector({
	currentSpace,
	currentSpaceLabel,
	selectedSpaceId,
	spaces,
	onSelectSpace,
}: {
	currentSpace: Space | null
	currentSpaceLabel: string
	selectedSpaceId: string | null
	spaces: Space[]
	onSelectSpace: (spaceId: string | null) => void
}) {
	const spaceDropdownProps = createSpaceMetadataDropdownProps(spaces)
	const buttonVisual = getSpaceMetadataButtonVisual(currentSpace)

	return (
		<Dropdown>
			<Button aria-label='空间' className='max-w-52' size='sm' type='button' variant='outline'>
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
