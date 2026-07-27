import { BulkActionBar } from '@/features/bulk-action'
import type { LifecycleMode } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'

import { useLifecycleScene } from '../hooks/useLifecycleScene'
import { LifecycleBoard } from './LifecycleBoard'

type LifecycleListProps = {
	mode: LifecycleMode
}

/**
 * 归档/回收站列表页：组合页面框架与生命周期集合。
 * wiring 在 {@link useLifecycleScene}。
 */
export function LifecycleList({ mode }: LifecycleListProps) {
	const scene = useLifecycleScene(mode)

	return (
		<PageFrame.Root>
			<PageFrame.Header breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />} />
			<PageFrame.Toolbar pills={scene.toolbarPills} />
			<PageFrame.Body>
				<LifecycleBoard {...scene.lifecycleBoardProps} />
			</PageFrame.Body>
			<PageFrame.BulkBar>
				<BulkActionBar
					action={
						<LifecycleBulkBarActions
							mode={scene.mode}
							onDelete={scene.bulk.deleteSelected}
							onDeletePermanently={scene.bulk.deletePermanentlySelected}
							onRestore={scene.bulk.restoreSelected}
						/>
					}
					onClear={scene.bulk.clearEntrySelection}
					selectedCount={scene.bulk.selectedCount}
				/>
			</PageFrame.BulkBar>
		</PageFrame.Root>
	)
}

function LifecycleBulkBarActions({
	mode,
	onDelete,
	onDeletePermanently,
	onRestore,
}: {
	mode: LifecycleMode
	onDelete: () => void
	onDeletePermanently: () => void
	onRestore: () => void
}) {
	return (
		<div className='flex items-center gap-1'>
			<Button
				className={BULK_ACTION_BUTTON_CLASS}
				onClick={onRestore}
				size='sm'
				type='button'
				variant='outline'
			>
				恢复
			</Button>
			{mode === 'archive' ? (
				<Button
					className={BULK_ACTION_BUTTON_CLASS}
					onClick={onDelete}
					size='sm'
					type='button'
					variant='outline'
				>
					删除
				</Button>
			) : (
				<Button
					className={BULK_ACTION_BUTTON_CLASS}
					onClick={onDeletePermanently}
					size='sm'
					type='button'
					variant='outline'
				>
					永久删除
				</Button>
			)}
		</div>
	)
}
