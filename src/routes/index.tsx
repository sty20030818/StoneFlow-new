import { createFileRoute, redirect } from '@tanstack/react-router'

import { resolveStartupPath } from '@/app/navigation'
import { spaceKeys } from '@/features/space'
import { listVisibleSpaces } from '@/features/space'
import { RouterFeedbackPage } from './-router-feedback'

export const Route = createFileRoute('/')({
	loader: async ({ context }) => {
		const spaces = await context.queryClient.ensureQueryData({
			queryKey: spaceKeys.visible(),
			queryFn: listVisibleSpaces,
		})

		const to = await resolveStartupPath({ spaces })
		throw redirect({
			to,
			replace: true,
		})
	},
	pendingComponent: RootRestorePending,
	errorComponent: RootRestoreError,
})

function RootRestorePending() {
	return <RouterFeedbackPage title='正在恢复上次工作区...' />
}

function RootRestoreError({ error }: { error: unknown }) {
	const message = error instanceof Error ? error.message : '恢复工作区失败'

	return <RouterFeedbackPage description={message} title='恢复工作区失败' />
}
