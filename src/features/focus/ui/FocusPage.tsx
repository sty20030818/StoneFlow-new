import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { Button } from '@/shared/ui/base/button'
import { TargetIcon } from 'lucide-react'

// TODO: 接入真实 Views/Focus API（后端需要按 viewKey 筛选的 list_tasks 扩展）
// 当前为空壳，等待后续阶段实现 Today/Pinned/Recent 视图数据拉取。

const FOCUS_VIEW_TABS = [
	{ key: 'today', label: 'Today' },
	{ key: 'pinned', label: 'Pinned' },
	{ key: 'recent', label: 'Recent' },
]

export function FocusPage() {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<MainCardLayout
			header={<MainCardHeader title='Views' />}
			toolbar={
				<MainCardToolbar
					pills={FOCUS_VIEW_TABS.map((view) => ({
						label: view.label,
						active: view.key === 'today',
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<EmptyPage>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<TargetIcon />
							</EmptyMedia>
							<EmptyTitle>今天没有任务</EmptyTitle>
							<EmptyDescription>
								今天需要关注的任务会出现在这里。
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={() => openTaskCreateDialog()} type='button'>
								创建任务
							</Button>
						</EmptyContent>
					</Empty>
				</EmptyPage>
			</div>
		</MainCardLayout>
	)
}
