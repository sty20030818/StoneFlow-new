import { getScopeLabel } from '@/app/layouts/shell/config'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { Button } from '@/shared/ui/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { InboxIcon, PlusIcon } from 'lucide-react'

// TODO: 接入真实 Inbox API（后端需要 list_inbox_tasks 命令）
// 当前为空壳，等待后续阶段实现 Inbox 数据拉取与整理逻辑。

export function InboxPage() {
	const { scope } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						<MainCardGhostAction aria-label='创建项目' onClick={() => openProjectCreateDialog()}>
							<PlusIcon />
						</MainCardGhostAction>
					}
					title='Inbox'
				/>
			}
			toolbar={
				<MainCardToolbar
					pills={[
						{ label: 'All issues', active: true },
						{ label: 'Untriaged' },
						{ label: 'Ready' },
					]}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<EmptyPage>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<InboxIcon />
							</EmptyMedia>
							<EmptyTitle>当前 Inbox 已清空</EmptyTitle>
							<EmptyDescription>
								新捕获的任务会先进入这里，补齐项目和优先级后再离开。
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={() => openTaskCreateDialog()} type='button'>
								创建任务
							</Button>
						</EmptyContent>
					</Empty>
				</EmptyPage>

				<div className='mt-auto pt-4 text-[12px] text-(--sf-color-shell-tertiary)'>
					当前 Scope：{getScopeLabel(scope, spaces)}
				</div>
			</div>
		</MainCardLayout>
	)
}
