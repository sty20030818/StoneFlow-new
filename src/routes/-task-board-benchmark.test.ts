import * as benchmarkAccess from './-task-board-benchmark-access'
import { canAccessTaskBoardBenchmark } from './-task-board-benchmark-access'
import { Route as IndexRoute } from './index'

describe('TaskBoard benchmark access', () => {
	it.each([
		[{ isProduction: true, isEnabled: true, isTauri: true }, true],
		[{ isProduction: false, isEnabled: true, isTauri: true }, false],
		[{ isProduction: true, isEnabled: false, isTauri: true }, false],
		[{ isProduction: true, isEnabled: true, isTauri: false }, false],
	] as const)('只允许已启用的 production Tauri build', (input, expected) => {
		expect(canAccessTaskBoardBenchmark(input)).toBe(expected)
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
