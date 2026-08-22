import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithMatchedRoute } from '@/test/renderWithRouter'
import {
	createFilterClause,
	encodeFilterQueryToSearchParam,
	FILTER_SEARCH_PARAM_KEY,
	type FilterQuery,
} from '../core'
import { parseListFilterSearch, useListFilterSession } from './useListFilterSession'

const BASE_QUERY: FilterQuery = {
	clauses: [createFilterClause('status', 'is', ['todo'], 'base-status')],
}

describe('parseListFilterSearch', () => {
	it('保留可解码 f，丢弃空与损坏值', () => {
		const encoded = encodeFilterQueryToSearchParam(BASE_QUERY)
		expect(parseListFilterSearch({ f: encoded!, other: 1 })).toEqual({
			[FILTER_SEARCH_PARAM_KEY]: encoded,
		})
		expect(parseListFilterSearch({ f: '' })).toEqual({})
		expect(parseListFilterSearch({ f: 'broken' })).toEqual({})
	})
})

describe('useListFilterSession', () => {
	it('显式空 draft 完整替换非空 base', async () => {
		const emptyDraft = encodeFilterQueryToSearchParam({ clauses: [] })
		await renderSession(`/tasks?f=${emptyDraft}`)

		expect(screen.getByTestId('dirty')).toHaveTextContent('true')
		expect(screen.getByTestId('effective-count')).toHaveTextContent('0')
	})

	it('写入与 base 语义相同的 draft 时删除 URL f', async () => {
		const otherDraft = encodeFilterQueryToSearchParam({
			clauses: [createFilterClause('status', 'is', ['doing'], 'draft-status')],
		})
		await renderSession(`/tasks?f=${otherDraft}`)

		fireEvent.click(screen.getByRole('button', { name: '写入 base' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/tasks')
		})
		expect(screen.getByTestId('location')).not.toHaveTextContent('?f=')
		expect(screen.getByTestId('dirty')).toHaveTextContent('false')
	})

	it('初始 URL draft 与 base 语义相同时自动删除 f', async () => {
		const equivalentDraft = encodeFilterQueryToSearchParam({
			clauses: [createFilterClause('status', 'is', ['todo'], 'different-id')],
		})
		await renderSession(`/tasks?f=${equivalentDraft}`)

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/tasks')
		})
		expect(screen.getByTestId('location')).not.toHaveTextContent('?f=')
		expect(screen.getByTestId('dirty')).toHaveTextContent('false')
	})

	it('Saved View base 尚未就绪时保留显式空 draft', async () => {
		const emptyDraft = encodeFilterQueryToSearchParam({ clauses: [] })
		await renderWithMatchedRoute(<DeferredBaseSessionProbe />, {
			initialEntry: `/tasks?f=${emptyDraft}`,
			path: '/tasks',
		})

		expect(screen.getByTestId('location')).toHaveTextContent(`?f=${emptyDraft}`)
		fireEvent.click(screen.getByRole('button', { name: '载入 base' }))

		expect(screen.getByTestId('location')).toHaveTextContent(`?f=${emptyDraft}`)
		expect(screen.getByTestId('dirty')).toHaveTextContent('true')
		expect(screen.getByTestId('effective-count')).toHaveTextContent('0')
	})
})

function renderSession(initialEntry: string) {
	return renderWithMatchedRoute(<SessionProbe />, {
		initialEntry,
		path: '/tasks',
	})
}

function SessionProbe() {
	const location = useLocation()
	const session = useListFilterSession({ base: BASE_QUERY })

	return (
		<>
			<output data-testid='dirty'>{String(session.dirty)}</output>
			<output data-testid='effective-count'>{session.effective.clauses.length}</output>
			<output data-testid='location'>
				{location.pathname}
				{location.searchStr}
			</output>
			<button onClick={() => session.setTemp(BASE_QUERY)} type='button'>
				写入 base
			</button>
		</>
	)
}

function DeferredBaseSessionProbe() {
	const location = useLocation()
	const [base, setBase] = useState<FilterQuery | null>(null)
	const session = useListFilterSession({ base })

	return (
		<>
			<output data-testid='dirty'>{String(session.dirty)}</output>
			<output data-testid='effective-count'>{session.effective.clauses.length}</output>
			<output data-testid='location'>
				{location.pathname}
				{location.searchStr}
			</output>
			<button onClick={() => setBase(BASE_QUERY)} type='button'>
				载入 base
			</button>
		</>
	)
}
