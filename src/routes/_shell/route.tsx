import { Button } from '@/shared/ui/base/button'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

import { RouterFeedbackPage } from '../-router-feedback'

export const Route = createFileRoute('/_shell')({
	component: ShellRouteGroup,
	errorComponent: ShellRouteGroupError,
	notFoundComponent: ShellRouteGroupNotFound,
})

function ShellRouteGroup() {
	return <Outlet />
}

function ShellRouteGroupError({ error, reset }: { error: unknown; reset: () => void }) {
	const message = error instanceof Error ? error.message : '工作区页面加载失败，请稍后重试。'

	return (
		<RouterFeedbackPage
			action={
				<div className='flex items-center justify-center gap-3'>
					<Button onClick={() => reset()} type='button' variant='outline'>
						重试
					</Button>
					<Button asChild type='button' variant='ghost'>
						<Link from='/' to='/all/tasks'>
							回到全部任务
						</Link>
					</Button>
				</div>
			}
			description={message}
			title='工作区加载失败'
		/>
	)
}

function ShellRouteGroupNotFound() {
	return (
		<RouterFeedbackPage
			action={
				<Button asChild type='button' variant='outline'>
					<Link from='/' to='/all/tasks'>
						回到全部任务
					</Link>
				</Button>
			}
			description='当前工作区路径不存在，可能是旧链接已失效，或者目标实体已经被删除。'
			title='工作区页面不存在'
		/>
	)
}
