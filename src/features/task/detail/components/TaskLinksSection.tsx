import { Alert, Button, Spinner } from '@heroui/react'
import { PlusIcon } from 'lucide-react'

import { useTaskLinksController } from '@/features/task/detail/model/useTaskLinksController'

import { TaskLinkEditorPopover } from './TaskLinkEditorPopover'
import { TaskLinkList } from './TaskLinkList'

type TaskLinksSectionProps = {
	taskId: string
}

export function TaskLinksSection({ taskId }: TaskLinksSectionProps) {
	const { links, status, error, addLink, editLink, removeLink, reloadLinks, openLink } =
		useTaskLinksController(taskId)

	return (
		<section aria-labelledby={`task-links-${taskId}`} className='flex flex-col gap-3'>
			<div className='flex items-center justify-between gap-3'>
				<h3
					className='text-[11px] font-medium tracking-[0.06em] text-muted uppercase'
					id={`task-links-${taskId}`}
				>
					链接
				</h3>
				<TaskLinkEditorPopover
					contentDrawerOwnedOverlay
					mode='create'
					trigger={
						<Button isDisabled={status !== 'ready'} size='sm' type='button' variant='outline'>
							<PlusIcon aria-hidden='true' className='size-3.5' />
							添加链接
						</Button>
					}
					onSubmit={addLink}
				/>
			</div>

			{status === 'loading' || status === 'idle' ? (
				<div className='flex items-center gap-2 text-xs text-muted' role='status'>
					<Spinner color='current' size='sm' />
					正在加载链接...
				</div>
			) : null}

			{status === 'error' ? (
				<Alert status='danger'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>链接加载失败</Alert.Title>
						<Alert.Description>{error ?? '请稍后重试。'}</Alert.Description>
					</Alert.Content>
					<Button onPress={() => void reloadLinks()} size='sm' type='button' variant='danger'>
						重试
					</Button>
				</Alert>
			) : null}

			{status === 'ready' && links.length > 0 ? (
				<TaskLinkList links={links} onEdit={editLink} onOpen={openLink} onRemove={removeLink} />
			) : null}
		</section>
	)
}
