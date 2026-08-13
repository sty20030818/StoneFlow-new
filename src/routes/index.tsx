import { createFileRoute, redirect } from '@tanstack/react-router'

import { resolveStartupPath } from '@/app/navigation'
import { spaceKeys } from '@/features/space'
import { listVisibleSpaces } from '@/features/space'
import { ShellLayoutSkeleton } from '@/layout/ShellLayoutSkeleton'

import { isTaskBoardBenchmarkEnabled } from './-task-board-benchmark-access'

export const Route = createFileRoute('/')({
	loader: async ({ context }) => {
		if (isTaskBoardBenchmarkEnabled()) {
			throw redirect({
				to: '/debug/task-board',
				replace: true,
			})
		}

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
	return <ShellLayoutSkeleton message='正在恢复上次工作区…' status='loading' />
}

function RootRestoreError({ error }: { error: unknown }) {
	const message = error instanceof Error ? error.message : '恢复工作区失败'
	return <ShellLayoutSkeleton message={message} status='error' />
}
