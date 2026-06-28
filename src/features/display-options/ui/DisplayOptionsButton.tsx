'use client'

import { SlidersHorizontalIcon } from 'lucide-react'

import type { TaskDisplayPageKey } from '@/features/display-options/core'
import { useTaskDisplayOptions } from '@/features/display-options/model'
import { Button } from '@/shared/ui/base/button'

import { DisplayOptionsPopover } from './DisplayOptionsPopover'

type DisplayOptionsButtonProps = {
	pageKey: TaskDisplayPageKey
}

/**
 * 入口按钮把 pageKey 与 display-options model 绑定起来，对外只暴露一个稳定入口。
 */
export function DisplayOptionsButton({ pageKey }: DisplayOptionsButtonProps) {
	const display = useTaskDisplayOptions(pageKey)

	return (
		<DisplayOptionsPopover
			actions={display.actions}
			error={display.error}
			options={display.options}
			pageKey={pageKey}
			status={display.status}
			trigger={
				<Button aria-label='视图选项' size='icon-sm' type='button' variant='outline'>
					<SlidersHorizontalIcon />
				</Button>
			}
		/>
	)
}
