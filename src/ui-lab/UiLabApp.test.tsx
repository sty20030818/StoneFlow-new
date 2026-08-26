import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { UiLabApp } from './UiLabApp'

describe('UiLabApp', () => {
	it('通过同一工作台完成双视图、分类、搜索、单预览与键盘路径', () => {
		render(<UiLabApp />)

		const preview = screen.getByRole('region', { name: '当前样例预览' })
		expect(screen.getByRole('button', { name: 'StoneFlow' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
		expect(within(preview).getByRole('heading', { name: 'StoneFlow Button' })).toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '新建任务' }))
		expect(within(preview).getByText('已触发 1 次')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Foundations' }))
		expect(within(preview).getByRole('heading', { name: '语义颜色与排版' })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
		expect(within(preview).getByRole('heading', { name: 'StoneFlow Button' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '动作分组与 Toolbar' }))
		expect(within(preview).getByRole('toolbar', { name: '审查动作工具栏' })).toBeInTheDocument()
		const compactDensity = within(preview).getByRole('radio', { name: '紧凑密度' })
		fireEvent.click(compactDensity)
		expect(compactDensity).toHaveAttribute('aria-checked', 'true')

		const search = screen.getByRole('searchbox', { name: '搜索样例' })
		fireEvent.change(search, { target: { value: '不存在的组件' } })
		expect(screen.getByText('没有匹配的样例')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
		expect(within(preview).getByRole('heading', { name: '动作分组与 Toolbar' })).toBeInTheDocument()

		fireEvent.change(search, { target: { value: 'PageFrame' } })
		fireEvent.click(screen.getByRole('button', { name: 'PageFrame 组合场景' }))
		expect(within(preview).getByRole('heading', { name: 'PageFrame 组合场景' })).toBeInTheDocument()
		expect(within(preview).queryByRole('button', { name: '新建任务' })).not.toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('radio', { name: '窄容器' }))
		expect(within(preview).getByText('当前条件：窄容器')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Fields' }))
		expect(
			screen.getByRole('heading', { name: 'Input / TextArea / SearchField' }),
		).toBeInTheDocument()
		const fieldSearch = within(preview).getByRole('searchbox', {
			name: 'SearchField 可清除查询',
		})
		fireEvent.change(fieldSearch, { target: { value: '界面审查' } })
		expect(within(preview).getByText('当前查询：界面审查')).toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '清空字段搜索' }))
		expect(within(preview).getByText('当前查询：空值')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Checkbox / Radio / Switch / Toggle' }))
		const reminderCheckbox = within(preview).getByRole('checkbox', { name: '同步提醒' })
		fireEvent.click(reminderCheckbox)
		expect(reminderCheckbox).toBeChecked()
		expect(
			within(preview).queryByRole('searchbox', { name: 'SearchField 可清除查询' }),
		).not.toBeInTheDocument()

		fireEvent.change(search, { target: { value: '设置表单' } })
		fireEvent.click(screen.getByRole('button', { name: 'Settings Form：保存与重试' }))
		expect(screen.getByRole('heading', { name: 'Settings Form：保存与重试' })).toBeInTheDocument()
		expect(within(preview).queryByRole('checkbox', { name: '同步提醒' })).not.toBeInTheDocument()

		vi.useFakeTimers()
		try {
			fireEvent.click(within(preview).getByRole('button', { name: '保存设置' }))
			expect(within(preview).getByText('正在保存演示设置…')).toBeInTheDocument()
			act(() => vi.advanceTimersByTime(600))
			expect(within(preview).getByRole('alert')).toHaveTextContent('保存失败')

			fireEvent.click(within(preview).getByRole('button', { name: '重试保存' }))
			act(() => vi.advanceTimersByTime(600))
			expect(within(preview).getByText('已保存演示设置；页面刷新后不会保留。')).toBeInTheDocument()
		} finally {
			vi.useRealTimers()
		}

		fireEvent.click(screen.getByRole('button', { name: 'Navigation' }))
		for (const sampleName of [
			'Breadcrumb',
			'Sidebar',
			'Tabs',
			'Pagination',
			'Command',
			'Settings Navigation',
		]) {
			expect(screen.getByRole('button', { name: sampleName })).toBeInTheDocument()
		}
		expect(within(preview).getByRole('list', { name: '当前位置' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Sidebar' }))
		const compactSidebar = within(preview).getByRole('treegrid', {
			name: 'StoneFlow 32px 侧边栏',
		})
		fireEvent.click(within(compactSidebar).getByRole('row', { name: '收件箱' }))
		expect(within(preview).getByText('当前项：收件箱')).toBeInTheDocument()

		fireEvent.change(search, { target: { value: 'Tabs' } })
		fireEvent.click(screen.getByRole('button', { name: 'Tabs' }))
		const overviewTab = within(preview).getByRole('tab', { name: '概览' })
		expect(overviewTab).toHaveAttribute('aria-selected', 'true')
		expect(within(preview).queryByRole('list', { name: '当前位置' })).not.toBeInTheDocument()

		fireEvent.change(search, { target: { value: 'Pagination' } })
		fireEvent.click(screen.getByRole('button', { name: 'Pagination' }))
		const nextPage = within(preview).getByRole('button', { name: '下一页' })
		fireEvent.click(nextPage)
		expect(within(preview).getByText('当前选择第 3 页')).toBeInTheDocument()
		expect(nextPage).toBeDisabled()
		expect(within(preview).queryByRole('tab', { name: '概览' })).not.toBeInTheDocument()

		const heroUIView = screen.getByRole('button', { name: 'HeroUI' })
		act(() => heroUIView.focus())
		fireEvent.keyDown(heroUIView, { key: 'Enter' })
		fireEvent.keyUp(heroUIView, { key: 'Enter' })
		expect(heroUIView).toHaveFocus()
		expect(heroUIView).toHaveAttribute('aria-pressed', 'true')
		expect(within(preview).getByRole('heading', { name: 'HeroUI Button' })).toBeInTheDocument()
		expect(within(preview).getByRole('button', { name: '主要动作' })).toBeInTheDocument()
		expect(within(preview).queryByRole('button', { name: '新建任务' })).not.toBeInTheDocument()

		for (const categoryName of ['已采用', '替换候选', '探索中']) {
			expect(screen.getByRole('button', { name: categoryName })).toBeInTheDocument()
		}
		for (const sampleName of [
			'HeroUI Button',
			'HeroUI Input',
			'HeroUI Select',
			'HeroUI Breadcrumbs',
			'HeroUI Tooltip',
			'HeroUI Modal',
			'HeroUI EmptyState',
			'HeroUI ListView',
		]) {
			expect(screen.getByRole('button', { name: sampleName })).toBeInTheDocument()
		}

		fireEvent.click(screen.getByRole('button', { name: 'HeroUI Modal' }))
		fireEvent.click(within(preview).getByRole('button', { name: '打开 Modal' }))
		expect(screen.getByRole('dialog', { name: '确认审查范围' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { hidden: true, name: '替换候选' }))
		expect(screen.queryByRole('dialog', { name: '确认审查范围' })).not.toBeInTheDocument()
		expect(within(preview).getByRole('heading', { name: 'HeroUI SearchField' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'HeroUI DatePicker' })).toBeInTheDocument()

		const candidateSearch = within(preview).getByRole('searchbox', {
			name: '搜索任务与项目',
		})
		fireEvent.change(candidateSearch, { target: { value: '日期' } })
		expect(within(preview).getByText('当前查询：日期')).toBeInTheDocument()

		fireEvent.change(search, { target: { value: 'DatePicker' } })
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI DatePicker' }))
		expect(within(preview).getByRole('heading', { name: 'HeroUI DatePicker' })).toBeInTheDocument()
		expect(
			within(preview).queryByRole('searchbox', { name: '搜索任务与项目' }),
		).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '探索中' }))
		expect(
			within(preview).getByText('首期不放探索项；只有带明确产品假设的独立 ticket 才能加入。'),
		).toBeInTheDocument()
	})
})
