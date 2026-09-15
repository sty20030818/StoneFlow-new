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
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
		fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('筛选F')
		expect(tooltip).not.toHaveTextContent('已启用')
	})

	it('公式条打开筛选菜单时关闭 trigger 提示', async () => {
		renderFilterEntry(<FilterBar />)

		const trigger = screen.getByRole('button', { name: '添加筛选' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
		fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
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

	it('公式条恢复动作只删除临时 Draft', () => {
		const value = renderFilterEntry(<FilterBar />)

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))

		expect(value.session.clearTemp).toHaveBeenCalledOnce()
	})

	it('没有临时 Draft 时不渲染公式条', () => {
		const value = createFilterUiValue()
		value.session.dirty = false

		renderFilterEntry(<FilterBar />, value)

		expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '添加筛选' })).not.toBeInTheDocument()
	})

	it.each(['点击行', 'Enter'] as const)(
		'勾选框支持连续多选，%s 选择后关闭两级菜单并归还焦点',
		async (method) => {
			const value = renderFilterEntry(<PageFilterButton />)

			const trigger = screen.getByRole('button', { name: '筛选' })
			fireEvent.click(trigger)
			const statusField = await screen.findByRole('menuitem', { name: /状态/ })
			fireEvent.keyDown(statusField, { key: 'ArrowRight' })

			const submenu = screen.getByRole('menu', { name: '状态' })
			const option = screen.getByRole('menuitemcheckbox', { name: '进行中' })
			const checkbox = option.querySelector('[data-slot="checkbox"]')!
			fireEvent.pointerDown(checkbox, { pointerType: 'mouse', button: 0 })
			fireEvent.click(checkbox)

			expect(value.session.replaceEffective).toHaveBeenCalledOnce()
			expect(vi.mocked(value.session.replaceEffective).mock.calls[0][0].clauses).toHaveLength(2)
			expect(value.session.replaceEffective).toHaveBeenCalledWith(
				expect.objectContaining({
					clauses: expect.arrayContaining([
						expect.objectContaining({ id: 'status-filter', field: 'status', values: ['todo'] }),
						expect.objectContaining({ field: 'status', values: ['doing'] }),
					]),
				}),
			)
			expect(submenu).toBeInTheDocument()
			expect(screen.getByRole('menu', { name: '筛选' })).toBeInTheDocument()

			if (method === '点击行') {
				fireEvent.pointerDown(option, { pointerType: 'mouse', button: 0 })
				fireEvent.click(option)
			} else {
				act(() => option.focus())
				fireEvent.keyDown(option, { key: 'Enter', code: 'Enter' })
				fireEvent.keyUp(option, { key: 'Enter', code: 'Enter' })
			}

			expect(value.session.replaceEffective).toHaveBeenCalledTimes(2)
			await waitFor(() => {
				expect(screen.queryByRole('menu', { name: '状态' })).not.toBeInTheDocument()
				expect(screen.queryByRole('menu', { name: '筛选' })).not.toBeInTheDocument()
				expect(trigger).toHaveFocus()
			})
		},
	)

	it('公式条保存入口调用外部打开动作', () => {
		const onSave = vi.fn()
		const value = { ...createFilterUiValue(), onSave }
		renderFilterEntry(<FilterBar />, value)

		fireEvent.click(screen.getByRole('button', { name: '保存' }))

		expect(onSave).toHaveBeenCalledOnce()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
		boundary: { scope: { type: 'all' }, context: { kind: 'all' }, baseViewKey: 'all' },
		session: {
			base: query,
			temp: query,
			effective: query,
			dirty: true,
			clearTemp: vi.fn(),
			replaceEffective: vi.fn(),
		},
	}

	return value
}
