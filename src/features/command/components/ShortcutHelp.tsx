import { Button, Card, Modal } from '@heroui/react'
import { KeyboardIcon, XIcon } from 'lucide-react'
import { useId, useMemo } from 'react'

import type { CommandContext, CommandRuntime } from '@/features/command/core'
import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { ActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import { useShortcutRegistry } from '@/features/command/shortcuts/shortcut-registry-context'

import { buildShortcutHelpGroups } from './shortcut-help-model'

type ShortcutHelpProps = {
	context: CommandContext
	description: string
	onOpenChange: (open: boolean) => void
	open: boolean
	runtime: CommandRuntime
	title: string
}

export function ShortcutHelp({
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
	const descriptionId = useId()

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Container placement='center' scroll='inside' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='max-h-[min(36rem,calc(100dvh-5rem))] max-w-[min(47.5rem,calc(100vw-1.5rem))] overflow-hidden'
					data-shortcut-help-dialog
				>
					<ActionTooltip label='关闭'>
						<Button
							aria-label='关闭快捷键帮助'
							className='absolute end-3 top-3 z-10'
							isIconOnly
							size='sm'
							slot='close'
							type='button'
							variant='ghost'
						>
							<XIcon aria-hidden className='size-3.5' />
						</Button>
					</ActionTooltip>

					<Modal.Header>
						<div className='min-w-0 space-y-1 ps-2 pe-10'>
							<div className='flex min-w-0 items-center gap-2'>
								<KeyboardIcon aria-hidden className='size-4 shrink-0 text-muted' />
								<Modal.Heading className='min-w-0'>
									<OverflowTooltip content={title}>{title}</OverflowTooltip>
								</Modal.Heading>
							</div>
							<p id={descriptionId}>
								<OverflowTooltip className='text-xs text-muted' content={description}>
									{description}
								</OverflowTooltip>
							</p>
						</div>
					</Modal.Header>

					<div
						aria-label='快捷键列表'
						className='scrollbar -mx-2 mt-3 flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-2 [scrollbar-gutter:stable_both-edges]'
						role='region'
						tabIndex={0}
					>
						{groups.map((group) => (
							<Card
								aria-labelledby={`${descriptionId}-${group.key}`}
								className='shrink-0'
								key={group.key}
								role='group'
							>
								<Card.Header>
									<Card.Title id={`${descriptionId}-${group.key}`}>{group.heading}</Card.Title>
								</Card.Header>
								<Card.Content>
									{group.entries.map((entry) => (
										<ShortcutHelpRow entry={entry} key={entry.id} />
									))}
								</Card.Content>
							</Card>
						))}
					</div>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

function ShortcutHelpRow({
	entry,
}: {
	entry: ReturnType<typeof buildShortcutHelpGroups>[number]['entries'][number]
}) {
	return (
		<article className='flex min-h-11 items-center gap-3 py-2'>
			<div className='min-w-0 flex-1'>
				<OverflowTooltip className='text-sm font-medium text-foreground' content={entry.title}>
					{entry.title}
				</OverflowTooltip>
				{entry.description ? (
					<OverflowTooltip className='mt-0.5 text-xs text-muted' content={entry.description}>
						{entry.description}
					</OverflowTooltip>
				) : null}
			</div>
			<div className='ms-auto flex shrink-0 flex-wrap items-center justify-end gap-2'>
				{entry.shortcuts.map((shortcut) => (
					<ShortcutTokens
						key={shortcut.map((token) => `${token.type}:${token.value}`).join('|')}
						tokens={shortcut}
					/>
				))}
			</div>
		</article>
	)
}
