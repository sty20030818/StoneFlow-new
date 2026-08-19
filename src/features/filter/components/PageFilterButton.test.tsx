import { act, fireEvent, screen, waitFor } from '@testing-library/react'

import { createFilterClause, normalizeFilterQuery } from '@/features/filter/core'
import {
	ListFilterUiProvider,
	type ListFilterUiValue,
} from '@/features/filter/model/ListFilterUiContext'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { FilterBar } from './FilterBar'
import { PageFilterButton } from './PageFilterButton'

describe('filter entry points', () => {
	it('缺少 ListFilterUiProvider 时立即暴露装配错误', () => {
		expect(() => renderWithInteractionProviders(<PageFilterButton />)).toThrow(
			'useListFilterUi 必须在 ListFilterUiProvider 内使用',
		)
	})

	it('页面入口保留稳定操作名与快捷键', async () => {
		renderFilterEntry(<PageFilterButton />)

		const trigger = screen.getByRole('button', { name: '筛选' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())

		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('筛选F')
		expect(tooltip).not.toHaveTextContent('已启用')
	})

	it('公式条打开筛选菜单时关闭 trigger 提示', async () => {
		renderFilterEntry(<FilterBar />)

		const trigger = screen.getByRole('button', { name: '添加筛选' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('添加筛选')

		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		expect(await screen.findByRole('searchbox', { name: '筛选字段' })).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('Esc 关闭筛选菜单后把焦点还给入口', async () => {
		renderFilterEntry(<PageFilterButton />)

		const trigger = screen.getByRole('button', { name: '筛选' })
		fireEvent.click(trigger)
		const search = await screen.findByRole('searchbox', { name: '筛选字段' })

		fireEvent.keyDown(search, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('searchbox', { name: '筛选字段' })).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})

	it('公式条的运算符和值选择会即时写回筛选 session', async () => {
		const value = renderFilterEntry(<FilterBar />)

		fireEvent.click(screen.getByRole('button', { name: '筛选运算符' }))
		fireEvent.click(await screen.findByRole('menuitemradio', { name: '不是' }))
		expect(value.session.replaceEffective).toHaveBeenLastCalledWith(
			expect.objectContaining({
				clauses: [expect.objectContaining({ op: 'is_not', values: ['todo'] })],
			}),
		)

		fireEvent.click(screen.getByRole('button', { name: '筛选值 待执行' }))
		fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: '进行中' }))
		expect(value.session.replaceEffective).toHaveBeenLastCalledWith(
			expect.objectContaining({
				clauses: [expect.objectContaining({ op: 'is', values: ['todo', 'doing'] })],
			}),
		)
	})

	it('字段菜单以嵌套子菜单选择值并保持根菜单打开', async () => {
		const value = renderFilterEntry(<PageFilterButton />)

		fireEvent.click(screen.getByRole('button', { name: '筛选' }))
		const statusField = await screen.findByRole('menuitem', { name: /状态/ })
		fireEvent.keyDown(statusField, { key: 'ArrowRight' })

		const submenu = screen.getByRole('menu', { name: '状态' })
		fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '进行中' }))

		expect(value.session.replaceEffective).toHaveBeenCalledWith(
			expect.objectContaining({
				clauses: [expect.objectContaining({ field: 'status', values: ['todo', 'doing'] })],
			}),
		)
		expect(submenu).toBeInTheDocument()
		expect(screen.getByRole('menu', { name: '筛选' })).toBeInTheDocument()
	})

	it('保存对话框沿用既有视图保存契约', async () => {
		const onSave = vi.fn(async () => undefined)
		const value = { ...createFilterUiValue(), onSave }
		renderFilterEntry(<FilterBar />, value)

		fireEvent.click(screen.getByRole('button', { name: '保存' }))
		expect(await screen.findByRole('dialog', { name: '保存为视图' })).toBeInTheDocument()
		fireEvent.change(screen.getByRole('textbox', { name: '视图名称' }), {
			target: { value: '高优先级任务' },
		})
		fireEvent.click(screen.getByRole('button', { name: '另存为' }))

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({ mode: 'create', name: '高优先级任务' })
		})
	})
})

function renderFilterEntry(ui: React.ReactNode, value = createFilterUiValue()) {
	renderWithInteractionProviders(<ListFilterUiProvider value={value}>{ui}</ListFilterUiProvider>)

	return value
}

function createFilterUiValue() {
	const query = normalizeFilterQuery({
		clauses: [createFilterClause('status', 'is', ['todo'], 'status-filter')],
	})
	const value: ListFilterUiValue = {
		session: {
			base: query,
			temp: query,
			effective: query,
			dirty: true,
			isEmpty: false,
			setTemp: vi.fn(),
			clearTemp: vi.fn(),
			replaceEffective: vi.fn(),
		},
	}

	return value
}
