'use client'

/**
 * 工具条「显示」入口：锚定 Display 面板；订阅 Shift+F / 命令 open-menu。
 */
import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { SlidersHorizontalIcon } from 'lucide-react'

import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
import type { TaskDisplayPageKey } from '@/features/display-options/core'
import { useTaskDisplayOptions } from '@/features/display-options/model'

import { subscribeDisplayUiEvent } from '../model/displayUiEvents'
import { DisplayOptionsPopover } from './DisplayOptionsPopover'

type DisplayOptionsButtonProps = {
	pageKey: TaskDisplayPageKey
}

export function DisplayOptionsButton({ pageKey }: DisplayOptionsButtonProps) {
	const display = useTaskDisplayOptions(pageKey)
	const [open, setOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)

	useEffect(() => {
		return subscribeDisplayUiEvent((event) => {
			if (event.type === 'open-menu') {
				setTooltipOpen(false)
				setOpen(true)
			}
		})
	}, [])

	return (
		<DisplayOptionsPopover
			actions={display.actions}
			error={display.error}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen)
				if (nextOpen) {
					setTooltipOpen(false)
				}
			}}
			open={open}
			options={display.options}
			pageKey={pageKey}
			status={display.status}
			trigger={
				<CommandActionTooltip
					commandId={COMMAND_IDS.displayOpenOptions}
					label='显示选项'
					onOpenChange={(nextOpen) => setTooltipOpen(open ? false : nextOpen)}
					isOpen={tooltipOpen}
				>
					<Button aria-label='显示选项' isIconOnly size='sm' type='button' variant='outline'>
						<SlidersHorizontalIcon className='size-4' />
					</Button>
				</CommandActionTooltip>
			}
		/>
	)
}
