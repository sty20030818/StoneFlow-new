'use client'

/**
 * 工具条「显示」入口：锚定 Display 面板；订阅 Shift+F / 命令 open-menu。
 */
import { useEffect, useState } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'

import type { TaskDisplayPageKey } from '@/features/display-options/core'
import { useTaskDisplayOptions } from '@/features/display-options/model'
import { Button } from '@/shared/components/base/button'

import { subscribeDisplayUiEvent } from '../model/displayUiEvents'
import { DisplayOptionsPopover } from './DisplayOptionsPopover'

type DisplayOptionsButtonProps = {
	pageKey: TaskDisplayPageKey
}

export function DisplayOptionsButton({ pageKey }: DisplayOptionsButtonProps) {
	const display = useTaskDisplayOptions(pageKey)
	const [open, setOpen] = useState(false)

	useEffect(() => {
		return subscribeDisplayUiEvent((event) => {
			if (event.type === 'open-menu') {
				setOpen(true)
			}
		})
	}, [])

	return (
		<DisplayOptionsPopover
			actions={display.actions}
			error={display.error}
			onOpenChange={setOpen}
			open={open}
			options={display.options}
			pageKey={pageKey}
			status={display.status}
			trigger={
				<Button aria-label='显示选项' size='icon-sm' type='button' variant='outline'>
					<SlidersHorizontalIcon />
				</Button>
			}
		/>
	)
}
