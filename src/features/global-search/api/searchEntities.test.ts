import { invoke } from '@tauri-apps/api/core'

import { searchEntities } from '@/features/global-search/api/searchEntities'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

const mockedInvoke = vi.mocked(invoke)

describe('searchEntities api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('发送 query 与 limitPerSection 到 search_entities 命令', async () => {
		mockedInvoke.mockResolvedValue({
			tasks: [],
			projects: [],
			completedTasks: [],
			completedProjects: [],
		})

		await searchEntities({
			query: 'stone',
			limitPerSection: 7,
		})

		expect(mockedInvoke).toHaveBeenCalledWith('search_entities', {
			input: {
				query: 'stone',
				limitPerSection: 7,
			},
		})
	})

	it('未传 limitPerSection 时使用默认值 5', async () => {
		mockedInvoke.mockResolvedValue({
			tasks: [],
			projects: [],
			completedTasks: [],
			completedProjects: [],
		})

		await searchEntities({
			query: 'task',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('search_entities', {
			input: {
				query: 'task',
				limitPerSection: 5,
			},
		})
	})
})
