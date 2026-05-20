import { TaskDrawer } from '@/features/task/detail'
import { Button } from '@/shared/ui/base/button'
import { DetailBody, DetailSection } from '@/shared/ui/detail'

import type { EntityDetailRouteState } from '../model/entityDetailTypes'

type EntityDetailDrawerHostProps = {
	activeDetail: EntityDetailRouteState
	open: boolean
	currentSpaceLabel: string
	onClose: () => void
}

export function EntityDetailDrawerHost({
	activeDetail,
	open,
	currentSpaceLabel: _currentSpaceLabel,
	onClose,
}: EntityDetailDrawerHostProps) {
	if (!open || !activeDetail) {
		return null
	}

	if (activeDetail.kind === 'task') {
		return <TaskDrawer onClose={onClose} taskId={activeDetail.id} />
	}

	return <ProjectDetailPlaceholder onClose={onClose} projectId={activeDetail.id} />
}

function ProjectDetailPlaceholder({ onClose, projectId }: { onClose: () => void; projectId: string }) {
	return (
		<DetailBody>
			<div className='space-y-4 px-4 py-4'>
				<DetailSection
					description='Project Detail 会在后续阶段接入独立 adapter；阶段 3 只验证 Host 可以分发 project。'
					title='项目详情'
				>
					<div className='rounded-md border border-sf-border-subtle bg-sf-surface-panel-muted px-3 py-2 text-[12px] leading-5 text-sf-text-secondary'>
						{projectId}
					</div>
				</DetailSection>
				<Button className='h-8 w-full justify-center' onClick={onClose} variant='outline'>
					关闭
				</Button>
			</div>
		</DetailBody>
	)
}
