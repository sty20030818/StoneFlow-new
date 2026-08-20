'use client'

import { cloneElement, type ReactElement } from 'react'

import { Popover } from '@heroui/react'

import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayPageKey,
} from '@/features/display-options/core'
import { cn } from '@/shared/lib/utils'

import { DisplayOptionsPanel } from './DisplayOptionsPanel'

type DisplayOptionsPopoverProps = {
	pageKey: TaskDisplayPageKey
	options: ResolvedTaskDisplayOptions
	status: 'loading' | 'ready' | 'error'
	error?: string | null
	actions: React.ComponentProps<typeof DisplayOptionsPanel>['actions']
	trigger: ReactElement<Record<string, unknown>>
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
		<Popover isOpen={open} onOpenChange={onOpenChange}>
			<Popover.Trigger
				render={({ children: _children, ...props }) =>
					cloneElement(trigger, props as Record<string, unknown>)
				}
			/>
			<Popover.Content
				className={cn('w-[min(320px,calc(100vw-24px))]', className)}
				offset={8}
				placement='bottom end'
			>
				<Popover.Dialog aria-label='显示选项'>
					<DisplayOptionsPanel
						actions={actions}
						error={error}
						options={options}
						pageKey={pageKey}
						status={status}
					/>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
