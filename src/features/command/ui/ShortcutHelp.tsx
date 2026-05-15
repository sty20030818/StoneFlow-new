import { useMemo } from 'react'

import type { CommandContext, CommandRuntime } from '@/features/command/core'
import { Kbd } from '@/shared/ui/base/kbd'
import { Button } from '@/shared/ui/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/ui/base/dialog'
import {
	createDialogHeaderClass,
	createDialogScrollClass,
	createDialogShellClass,
} from '@/shared/ui/patterns/create-dialog'
import { cn } from '@/shared/lib/utils'
import { ChevronRightIcon, XIcon } from 'lucide-react'

import { buildShortcutHelpGroups } from './shortcut-help-model'

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

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={cn(
					createDialogShellClass,
					'sm:max-w-4xl',
					className,
				)}
				disableAnimation
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>{title}</DialogTitle>
				<DialogDescription className='sr-only'>{description}</DialogDescription>

				<div className={cn(createDialogHeaderClass, 'border-b border-border/70')}>
					<div className='flex min-w-0 items-center gap-1 text-[13px]'>
						<span className='shrink-0 text-sf-text-secondary'>StoneFlow</span>
						<ChevronRightIcon className='size-3.5 shrink-0 text-sf-icon-subtle' />
						<span className='truncate font-black text-foreground'>{title}</span>
					</div>
					<Button
						className='size-7 text-sf-icon-secondary'
						onClick={() => onOpenChange(false)}
						size='icon-sm'
						variant='ghost'
					>
						<XIcon className='size-3.5' />
					</Button>
				</div>
				<div className={cn(createDialogScrollClass, 'space-y-3 py-3')}>
					<p className='text-[12px] leading-5 text-sf-text-secondary'>
						{description}
					</p>
					<div className='space-y-6'>
						{groups.map((group) => (
							<section key={group.key} className='space-y-2.5'>
								<h3 className='text-[10.5px] font-medium tracking-[0.06em] text-muted-foreground uppercase'>
									{group.heading}
								</h3>
								<div className='overflow-hidden rounded-xl border border-border/70 bg-card/55'>
									{group.entries.map((entry, index) => (
										<article
											className={cn(
												'flex items-start gap-4 px-4 py-3.5',
												index > 0 && 'border-t border-border/60',
											)}
											key={entry.id}
										>
											<div className='min-w-0 flex-1 space-y-1'>
												<div className='flex items-center gap-2'>
													<span className='truncate text-sm font-medium text-foreground'>
														{entry.title}
													</span>
													{entry.isCommandOnly ? (
														<span className='shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-[0.04em] text-muted-foreground uppercase'>
															Command Only
														</span>
													) : null}
												</div>
												{entry.description ? (
													<p className='text-xs leading-5 text-muted-foreground'>
														{entry.description}
													</p>
												) : null}
											</div>
											<div className='shrink-0 self-center'>
												{entry.shortcut ? (
													<Kbd>{entry.shortcut}</Kbd>
												) : (
													<span className='text-xs text-muted-foreground'>无默认快捷键</span>
												)}
											</div>
										</article>
									))}
								</div>
							</section>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
