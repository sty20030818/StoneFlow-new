import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
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
import { Layers2Icon } from 'lucide-react'

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
			header={<MainCardHeader breadcrumb={<ViewsBreadcrumb />} />}
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
								<Layers2Icon />
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

function ViewsBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<Layers2Icon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						视图
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
