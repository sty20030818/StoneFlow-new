import { createFileRoute, notFound } from '@tanstack/react-router'

import { TaskBoardPerformancePage } from '@/features/task/page'

import { isTaskBoardBenchmarkEnabled } from './-task-board-benchmark-access'

export const Route = createFileRoute('/debug/task-board')({
	beforeLoad: () => {
		if (!isTaskBoardBenchmarkEnabled()) {
			throw notFound()
		}
	},
	component: TaskBoardPerformancePage,
})
