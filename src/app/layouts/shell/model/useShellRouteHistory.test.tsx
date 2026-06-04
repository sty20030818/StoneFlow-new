import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useShellRouteHistory } from './useShellRouteHistory'

const spaces = [
	{ id: 'space-a', name: '工作' },
	{ id: 'space-b', name: '生活' },
] as never

const projects = [
	{ id: 'project-a', label: '项目 A', spaceId: 'space-a', spaceName: '工作' },
] as never

describe('useShellRouteHistory', () => {
	it('基于 ShellRoute 生成 canonical label 并剥离 drawer query', async () => {
		renderHistoryProbe('/spaces/space-a/inbox?task=task-a')

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/spaces/space-a/inbox|收件箱|space-a|工作',
			)
		})
	})

	it('识别 all views 和 space project route', async () => {
		renderHistoryProbe('/all/views/focus')

		fireEvent.click(screen.getByRole('button', { name: 'go project' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/spaces/space-a/projects/project-a|项目 A|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent(
			'/all/views/focus|视图|null|所有空间',
		)
	})

	it('canonical detail 进入历史记录', async () => {
		renderHistoryProbe('/spaces/space-a/tasks/task-a')

		fireEvent.click(screen.getByRole('button', { name: 'go project detail' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/spaces/space-a/projects/project-a|项目 A|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent(
			'/spaces/space-a/tasks/task-a|任务详情|space-a|工作',
		)
	})

	it('非 shell 路径不作为历史 entry', async () => {
		renderHistoryProbe('/quick-create')

		fireEvent.click(screen.getByRole('button', { name: 'go task detail' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/spaces/space-a/tasks/task-a|任务详情|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent('empty')
	})

	it('REPLACE 会替换当前 history entry', async () => {
		renderHistoryProbe('/spaces/space-a/inbox')

		fireEvent.click(screen.getByRole('button', { name: 'replace views' }))

		await waitFor(() => {
			expect(screen.getByTestId('current-entry')).toHaveTextContent(
				'/spaces/space-a/views/today|视图|space-a|工作',
			)
		})
		expect(screen.getByTestId('history-entries')).toHaveTextContent('empty')
	})
})

function renderHistoryProbe(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<HistoryProbe />} path='*' />
			</Routes>
		</MemoryRouter>,
	)
}

function HistoryProbe() {
	const navigate = useNavigate()
	const history = useShellRouteHistory({
		currentScope: { type: 'space', spaceId: 'space-a' },
		currentSpaceId: 'space-a',
		spaces,
		projects,
	})

	return (
		<div>
			<div data-testid='current-entry'>{formatEntry(history.currentEntry)}</div>
			<div data-testid='history-entries'>
				{history.entries.length > 0 ? history.entries.map(formatEntry).join('\n') : 'empty'}
			</div>
			<button onClick={() => navigate('/spaces/space-a/projects/project-a')} type='button'>
				go project
			</button>
			<button onClick={() => navigate('/spaces/space-a/tasks/task-a')} type='button'>
				go task detail
			</button>
			<button onClick={() => navigate('/spaces/space-a/projects/project-a')} type='button'>
				go project detail
			</button>
			<button
				onClick={() => navigate('/spaces/space-a/views/today', { replace: true })}
				type='button'
			>
				replace views
			</button>
		</div>
	)
}

function formatEntry(entry: {
	path: string
	label: string
	spaceId: string | null
	spaceName: string
}) {
	return `${entry.path}|${entry.label}|${entry.spaceId ?? 'null'}|${entry.spaceName}`
}
