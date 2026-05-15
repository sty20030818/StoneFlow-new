import { useMemo, useRef } from 'react'

import { XIcon } from 'lucide-react'

import type { CommandContext, CommandRuntime } from '@/features/command/core'
import { Button } from '@/shared/ui/base/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog'
import { cn } from '@/shared/lib/utils'
import { OverlayScrollbar } from '@/shared/ui/OverlayScrollbar'

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
	const groups = useMemo(() => buildShortcutHelpGroups(runtime, context), [context, runtime])
	const contentRef = useRef<HTMLDivElement>(null)
	const scrollRef = useRef<HTMLDivElement>(null)

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={cn(
					'top-[18%] translate-y-0 overflow-hidden rounded-lg border border-sf-border-subtle bg-background/98 p-0 text-popover-foreground shadow-(--sf-shadow-popover) max-sm:max-w-[calc(100%-1.5rem)] max-lg:max-w-[calc(100%-1.5rem)] sm:max-w-190',
					className,
				)}
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

				<Button
					aria-label='关闭快捷键帮助'
					className='absolute top-3 right-3 size-8'
					onClick={() => onOpenChange(false)}
					variant='ghost'
				>
					<XIcon className='size-4' />
				</Button>
				<div className='px-5 pt-4 pb-3'>
					<h2 className='truncate pr-9 text-[16px] font-medium text-foreground'>{title}</h2>
					<p className='mt-1 truncate text-[12px] text-sf-text-tertiary'>{description}</p>
				</div>
				<div className='relative min-h-0'>
					<div ref={scrollRef} className='no-scrollbar max-h-120 overflow-y-auto px-1 pb-2'>
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
					</div>
					<OverlayScrollbar
						minThumbHeight={28}
						scrollRef={scrollRef}
						thumbLengthRatio={0.58}
						trackInsetBottom={8}
						trackInsetTop={4}
					/>
				</div>
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
				<div className='flex min-w-0 items-center gap-2'>
					<span className='truncate text-[14px] font-medium text-foreground'>{entry.title}</span>
					{entry.isCommandOnly ? (
						<span className='shrink-0 rounded-sm bg-sf-surface-app px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-sf-text-tertiary'>
							命令内
						</span>
					) : null}
				</div>
				{entry.description ? (
					<p className='mt-0.5 truncate text-[12px] text-sf-text-tertiary'>{entry.description}</p>
				) : null}
			</div>
			<div className='ml-auto flex shrink-0 items-center justify-end'>
				{entry.shortcut ? (
					<ShortcutTokens
						kbdClassName='h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] text-sf-text-secondary'
						separatorClassName='text-sf-text-quaternary'
						tokens={entry.shortcut}
					/>
				) : (
					<span className='text-[12px] text-sf-text-quaternary'>未绑定</span>
				)}
			</div>
		</article>
	)
}
