import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { ListItem } from '@/shared/ui/ListItem'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { SparklesIcon } from 'lucide-react'

const inboxRows = [
	{
		id: 'task-inbox-triage',
		title: '整理今天捕获的新任务',
		description: '补齐优先级、项目和处理时段，让它尽快离开 Inbox。',
		priority: 'P1',
		due: '今天',
	},
	{
		id: 'task-inbox-command',
		title: '把全局入口收回 Header',
		description: '搜索、新建与跳转都由顶部 Header 承接，不再拆成额外条带。',
		priority: 'P2',
		due: '本周',
	},
	{
		id: 'task-inbox-drawer',
		title: '验证覆盖式 Drawer 详情层',
		description: '从列表进入详情，但不挤压 Main，也不制造厚重 modal 感。',
		priority: 'P2',
		due: '静态验收',
	},
]

export function InboxPage() {
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)

	return (
		<div className='p-4'>
			<PanelSurface
				actions={
					<Button variant='outline'>
						<SparklesIcon data-icon='inline-start' />
						快速整理
					</Button>
				}
				eyebrow='Inbox'
				title='待整理队列'
			>
				<div className='flex flex-col gap-3'>
					{inboxRows.map((row) => (
						<ListItem
							key={row.id}
							description={row.description}
							onClick={() => openDrawer('task', row.id)}
							title={row.title}
							trailing={
								<>
									<Badge variant='outline'>{row.priority}</Badge>
									<Badge variant='secondary'>{row.due}</Badge>
								</>
							}
						/>
					))}
				</div>
			</PanelSurface>
		</div>
	)
}
