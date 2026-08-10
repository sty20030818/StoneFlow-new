import { useEffect, useMemo, useRef, useState } from 'react'

import { XIcon } from 'lucide-react'

import type { CommandContext, CommandRuntime } from '@/features/command/core'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { dialogShellReadingClass } from '@/shared/components/patterns/dialog-shell'
import { ActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'
import { useShortcutRegistry } from '@/features/command/shortcuts/shortcut-registry-context'

import { buildShortcutHelpGroups } from './shortcut-help-model'
import { ShortcutTokens } from './ShortcutTokens'

type ShortcutHelpProps = {
	className?: string
	context: CommandContext
	description: string
	onOpenChange: (open: boolean) => void
	open: boolean
	runtime: CommandRuntime
	title: string
}

export function ShortcutHelp({
	className,
	context,
	description,
	onOpenChange,
	open,
	runtime,
	title,
}: ShortcutHelpProps) {
	const shortcutRegistry = useShortcutRegistry()
	const groups = useMemo(
		() => buildShortcutHelpGroups(runtime, context, shortcutRegistry),
		[context, runtime, shortcutRegistry],
	)
	const contentRef = useRef<HTMLDivElement>(null)
	const [closeTooltipOpen, setCloseTooltipOpen] = useState(false)

	useEffect(() => {
		if (!open) {
			setCloseTooltipOpen(false)
		}
	}, [open])

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			setCloseTooltipOpen(false)
		}
		onOpenChange(nextOpen)
	}

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent
				className={cn(dialogShellReadingClass, className)}
				disableAnimation
				onOpenAutoFocus={(event) => {
					event.preventDefault()
					contentRef.current?.focus({ preventScroll: true })
				}}
				ref={contentRef}
				showCloseButton={false}
				tabIndex={-1}
			>
				<DialogTitle className='sr-only'>{title}</DialogTitle>
				<DialogDescription className='sr-only'>{description}</DialogDescription>

				<ActionTooltip onOpenChange={setCloseTooltipOpen} open={closeTooltipOpen}>
					<ActionTooltip.Trigger asChild>
						<Button
							aria-label='关闭快捷键帮助'
							className='absolute top-3 right-3 size-8'
							onClick={() => handleOpenChange(false)}
							variant='ghost'
						>
							<XIcon aria-hidden className='size-4' />
						</Button>
					</ActionTooltip.Trigger>
					<ActionTooltip.Content>
						<ActionTooltip.Row label='关闭' />
					</ActionTooltip.Content>
				</ActionTooltip>
				<div className='px-5 pt-4 pb-3'>
					<OverflowTooltip className='pr-9 text-[16px] font-medium text-foreground' content={title}>
						{title}
					</OverflowTooltip>
					<OverflowTooltip className='mt-1 text-[12px] text-sf-text-tertiary' content={description}>
						{description}
					</OverflowTooltip>
				</div>
				<AppScrollArea
					className='max-h-120'
					minThumbHeight={28}
					thumbLengthRatio={0.58}
					trackInsetBottom={8}
					trackInsetTop={4}
					viewportClassName='px-1 pb-2'
				>
					{groups.map((group) => (
						<section key={group.key} className='pt-1 first:pt-0'>
							<h3 className='px-3 pt-1 pb-2 text-[13px] font-medium tracking-normal text-sf-text-secondary'>
								{group.heading}
							</h3>
							<div className='flex flex-col'>
								{group.entries.map((entry) => (
									<ShortcutHelpRow entry={entry} key={entry.id} />
								))}
							</div>
						</section>
					))}
				</AppScrollArea>
			</DialogContent>
		</Dialog>
	)
}

function ShortcutHelpRow({
	entry,
}: {
	entry: ReturnType<typeof buildShortcutHelpGroups>[number]['entries'][number]
}) {
	return (
		<article className='mx-1 flex min-h-11 items-center gap-3 rounded-md bg-transparent px-3 py-2'>
			<div className='min-w-0 flex-1'>
				<OverflowTooltip className='text-[14px] font-medium text-foreground' content={entry.title}>
					{entry.title}
				</OverflowTooltip>
				{entry.description ? (
					<OverflowTooltip
						className='mt-0.5 text-[12px] text-sf-text-tertiary'
						content={entry.description}
					>
						{entry.description}
					</OverflowTooltip>
				) : null}
			</div>
			<div className='ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2'>
				{entry.shortcuts.map((shortcut) => (
					<ShortcutTokens
						kbdClassName='h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] text-sf-text-secondary'
						key={shortcut.map((token) => `${token.type}:${token.value}`).join('|')}
						separatorClassName='text-sf-text-quaternary'
						tokens={shortcut}
					/>
				))}
			</div>
		</article>
	)
}
