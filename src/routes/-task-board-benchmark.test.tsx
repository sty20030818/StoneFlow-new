import { screen } from '@testing-library/react'

import { TaskBoardPerformancePage } from '@/features/task/page'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import * as benchmarkAccess from './-task-board-benchmark-access'
import { canAccessTaskBoardBenchmark } from './-task-board-benchmark-access'
import { Route as IndexRoute } from './index'

describe('TaskBoard benchmark', () => {
	afterEach(() => vi.unstubAllEnvs())

	it('只允许已启用的 production Tauri build', () => {
		expect(
			canAccessTaskBoardBenchmark({ isProduction: true, isEnabled: true, isTauri: true }),
		).toBe(true)
		expect(
			canAccessTaskBoardBenchmark({ isProduction: false, isEnabled: true, isTauri: true }),
		).toBe(false)
		expect(
			canAccessTaskBoardBenchmark({ isProduction: true, isEnabled: false, isTauri: true }),
		).toBe(false)
		expect(
			canAccessTaskBoardBenchmark({ isProduction: true, isEnabled: true, isTauri: false }),
		).toBe(false)
	})

	it('用完整 provider 装配真实 TaskBoard，并记录实际视口', () => {
		vi.stubEnv('VITE_BENCHMARK_COMMIT', 'benchmark-commit')
		const { container } = renderWithInteractionProviders(<TaskBoardPerformancePage />)

		expect(screen.getByRole('heading', { name: 'TaskBoard 性能基线' })).toBeInTheDocument()
		expect(screen.getByRole('combobox', { name: '性能 fixture' })).toHaveValue('grouped')
		expect(screen.getByRole('textbox', { name: 'Commit' })).toHaveValue('benchmark-commit')
		expect(container.querySelector('[data-task-board-virtual="sections"]')).toHaveAttribute(
			'data-task-board-extent',
			'100840',
		)
		expect(
			(screen.getByRole('textbox', { name: '性能测量 JSON' }) as HTMLTextAreaElement).value,
		).toContain('"commit": "benchmark-commit"')
		expect(
			(screen.getByRole('textbox', { name: '性能测量 JSON' }) as HTMLTextAreaElement).value,
		).toContain(`"width": ${window.innerWidth}`)
	})

	it('启用 benchmark build 时，根 loader 在读取业务数据前重定向', async () => {
		vi.spyOn(benchmarkAccess, 'isTaskBoardBenchmarkEnabled').mockReturnValue(true)
		const ensureQueryData = vi.fn()
		const loader = IndexRoute.options.loader

		expect(loader).toBeTypeOf('function')
		if (typeof loader !== 'function') throw new Error('根路由缺少 loader')
		await expect(
			loader({ context: { queryClient: { ensureQueryData } } } as never),
		).rejects.toMatchObject({ options: { to: '/debug/task-board', replace: true } })
		expect(ensureQueryData).not.toHaveBeenCalled()
	})
})
