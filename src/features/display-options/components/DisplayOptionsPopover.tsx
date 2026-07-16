'use client'

import type { ReactNode } from 'react'

import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayPageKey,
} from '@/features/display-options/core'
import { cn } from '@/shared/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/base/popover'

import { DisplayOptionsPanel } from './DisplayOptionsPanel'

type DisplayOptionsPopoverProps = {
	pageKey: TaskDisplayPageKey
	options: ResolvedTaskDisplayOptions
	status: 'loading' | 'ready' | 'error'
	error?: string | null
	actions: React.ComponentProps<typeof DisplayOptionsPanel>['actions']
	trigger: ReactNode
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
}

export function DisplayOptionsPopover({
	pageKey,
	options,
	status,
	error,
	actions,
	trigger,
	open,
	onOpenChange,
	className,
}: DisplayOptionsPopoverProps) {
	return (
		<Popover onOpenChange={onOpenChange} open={open}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				align='end'
				className={cn('w-[min(360px,calc(100vw-24px))] p-3', className)}
				sideOffset={8}
			>
				<DisplayOptionsPanel
					actions={actions}
					error={error}
					options={options}
					pageKey={pageKey}
					status={status}
				/>
			</PopoverContent>
		</Popover>
	)
}
