import { Modal } from '@heroui/react'
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
				>
					<ActionTooltip label='关闭'>
						<Modal.CloseTrigger aria-label='关闭快捷键帮助' className='end-3 top-3 z-10' />
					</ActionTooltip>

					<Modal.Header>
						<Modal.Heading className='pr-8'>
							<OverflowTooltip content={title}>{title}</OverflowTooltip>
						</Modal.Heading>
						<p id={descriptionId}>
							<OverflowTooltip className='text-xs text-muted' content={description}>
								{description}
							</OverflowTooltip>
						</p>
					</Modal.Header>

					<Modal.Body aria-label='快捷键列表' role='region'>
						{groups.map((group) => (
							<section key={group.key} className='pt-1 first:pt-0'>
								<h3 className='px-3 pt-1 pb-2 text-xs font-medium text-muted'>{group.heading}</h3>
								<div className='flex flex-col'>
									{group.entries.map((entry) => (
										<ShortcutHelpRow entry={entry} key={entry.id} />
									))}
								</div>
							</section>
						))}
					</Modal.Body>
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
		<article className='mx-1 flex min-h-11 items-center gap-3 rounded-md bg-transparent px-3 py-2'>
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
			<div className='ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2'>
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
