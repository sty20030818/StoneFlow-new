import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { useTaskLinksController } from '@/features/task/detail/model/useTaskLinksController'
import { DetailMetaButton, DetailSection } from '@/shared/components/detail'

import { TaskLinkEditorPopover } from './TaskLinkEditorPopover'
import { TaskLinkList } from './TaskLinkList'

type TaskLinksSectionProps = {
	taskId: string
}

export function TaskLinksSection({ taskId }: TaskLinksSectionProps) {
	const { links, status, error, addLink, editLink, removeLink, reloadLinks, openLink } =
		useTaskLinksController(taskId)
	const [isCreateOpen, setCreateOpen] = useState(false)

	return (
		<DetailSection title='链接'>
			<div className='space-y-3'>
				{status === 'loading' || status === 'idle' ? (
					<p className='text-[12px] text-sf-shell-text-tertiary'>正在加载链接...</p>
				) : null}

				{status === 'error' ? (
					<div className='flex items-center justify-between gap-2 rounded-xl border border-dashed border-sf-border-secondary px-3 py-2 text-[12px] text-sf-shell-text-tertiary'>
						<span>{error ?? '链接加载失败'}</span>
						<button
							className='text-sf-text-interactive hover:underline'
							onClick={() => void reloadLinks()}
							type='button'
						>
							重试
						</button>
					</div>
				) : null}

				{status === 'ready' && links.length > 0 ? (
					<TaskLinkList links={links} onEdit={editLink} onOpen={openLink} onRemove={removeLink} />
				) : null}

				<TaskLinkEditorPopover
					anchor={
						<DetailMetaButton
							disabled={status !== 'ready'}
							icon={<PlusIcon className='size-3.5' />}
							label='添加链接'
							onClick={() => setCreateOpen(true)}
						/>
					}
					contentDrawerOwnedOverlay
					mode='create'
					open={isCreateOpen}
					onOpenChange={setCreateOpen}
					onSubmit={addLink}
				/>
			</div>
		</DetailSection>
	)
}
