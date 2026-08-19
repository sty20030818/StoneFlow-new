import type { TaskLink } from '@/shared/types'

import type { TaskLinkEditorValue } from './TaskLinkEditorPopover'
import { TaskLinkRow } from './TaskLinkRow'

type TaskLinkListProps = {
	links: TaskLink[]
	onOpen: (link: TaskLink) => Promise<void> | void
	onEdit: (linkId: string, value: TaskLinkEditorValue) => Promise<void>
	onRemove: (linkId: string) => Promise<void>
}

export function TaskLinkList({ links, onOpen, onEdit, onRemove }: TaskLinkListProps) {
	return (
		<div className='flex flex-col gap-2'>
			{links.map((link) => (
				<TaskLinkRow
					key={link.id}
					link={link}
					onEdit={onEdit}
					onOpen={onOpen}
					onRemove={onRemove}
				/>
			))}
		</div>
	)
}
