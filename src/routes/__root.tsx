import { Button } from '@heroui/react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import type { AppRouterContext } from '@/app/router'
import { RouterFeedbackPage } from './-router-feedback'

export const Route = createRootRouteWithContext<AppRouterContext>()({
	component: RootRouteComponent,
	errorComponent: RootRouteError,
	notFoundComponent: RootRouteNotFound,
})

function RootRouteComponent() {
	return <Outlet />
}

function RootRouteError({ error, reset }: { error: unknown; reset: () => void }) {
	const message = error instanceof Error ? error.message : '应用启动失败，请稍后再试。'

	return (
		<RouterFeedbackPage
			action={
				<Button onPress={() => reset()} type='button' variant='outline'>
					重试
				</Button>
			}
			description={message}
			title='应用加载失败'
		/>
	)
}

function RootRouteNotFound() {
	return (
		<RouterFeedbackPage
			description='当前地址不存在，可能是旧链接或路径已迁移。'
			title='页面不存在'
		/>
	)
}
