import { Button, Surface } from '@heroui/react'
import { ExternalLinkIcon, PencilLineIcon, Trash2Icon } from 'lucide-react'

import { OverflowTooltip } from '@/shared/components/tooltip'
import type { TaskLink } from '@/shared/types'

import { TaskLinkEditorPopover, type TaskLinkEditorValue } from './TaskLinkEditorPopover'

type TaskLinkRowProps = {
	link: TaskLink
	onOpen: (link: TaskLink) => Promise<void> | void
	onEdit: (linkId: string, value: TaskLinkEditorValue) => Promise<void>
	onRemove: (linkId: string) => Promise<void>
}

export function TaskLinkRow({ link, onOpen, onEdit, onRemove }: TaskLinkRowProps) {
	const linkSubtitle = formatLinkSubtitle(link.url)

	return (
		<Surface className='flex items-start gap-3 p-3' variant='secondary'>
			<div className='min-w-0 flex-1'>
				<OverflowTooltip className='text-xs font-medium text-foreground' content={link.title}>
					{link.title}
				</OverflowTooltip>
				<OverflowTooltip className='mt-1 text-xs text-muted' content={linkSubtitle}>
					{linkSubtitle}
				</OverflowTooltip>
			</div>
			<div className='flex shrink-0 items-center gap-1'>
				<Button
					aria-label={`打开链接：${link.title}`}
					onPress={() => void onOpen(link)}
					size='sm'
					type='button'
					variant='outline'
				>
					<ExternalLinkIcon aria-hidden='true' className='size-3.5' />
					打开
				</Button>
				<TaskLinkEditorPopover
					contentDrawerOwnedOverlay
					initialValue={{ title: link.title, url: link.url }}
					mode='edit'
					trigger={
						<Button
							aria-label={`编辑链接：${link.title}`}
							isIconOnly
							size='sm'
							type='button'
							variant='ghost'
						>
							<PencilLineIcon aria-hidden='true' className='size-4' />
						</Button>
					}
					onSubmit={(value) => onEdit(link.id, value)}
				/>
				<Button
					aria-label={`删除链接：${link.title}`}
					isIconOnly
					onPress={() => void onRemove(link.id).catch(() => undefined)}
					size='sm'
					type='button'
					variant='danger-soft'
				>
					<Trash2Icon aria-hidden='true' className='size-4' />
				</Button>
			</div>
		</Surface>
	)
}

function formatLinkSubtitle(url: string) {
	try {
		const parsed = new URL(url)
		return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`
	} catch {
		return url
	}
}
