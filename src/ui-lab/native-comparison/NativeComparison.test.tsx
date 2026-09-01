import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { NativeComparison, NativeComparisonFixture } from './NativeComparison'
import {
	currentNativeComparisonAccent,
	nativeComparisonUrl,
	parseNativeComparisonQuery,
} from './nativeComparisonContract'

describe('NativeComparison', () => {
	it('只接受固定 mode、fixture 与 Accent，并生成单一开发期入口 URL', () => {
		expect(parseNativeComparisonQuery('?mode=token&fixture=button&accent=ocean')).toEqual({
			ok: true,
			value: { mode: 'token', fixture: 'button', accent: 'ocean' },
		})
		expect(
			parseNativeComparisonQuery('?mode=token&fixture=oss-actions&accent=ocean'),
		).toMatchObject({
			ok: true,
			value: { fixture: 'oss-actions' },
		})
		expect(parseNativeComparisonQuery('?mode=current&fixture=button')).toMatchObject({ ok: false })
		expect(parseNativeComparisonQuery('?mode=upstream&fixture=modal')).toMatchObject({ ok: false })
		expect(parseNativeComparisonQuery('?mode=token&fixture=tooltip&accent=unknown')).toMatchObject({
			ok: false,
		})
		expect(currentNativeComparisonAccent('unknown')).toBe('cobalt')
		expect(nativeComparisonUrl({ mode: 'upstream', fixture: 'tooltip', accent: 'plum' })).toBe(
			'/ui-lab-baseline.html?mode=upstream&fixture=tooltip&accent=plum',
		)
	})

	it('第九批复用真实 SearchField 语义与 NumberField 步进行为', () => {
		const { rerender } = render(<NativeComparisonFixture fixture='oss-search-field' />)
		expect(screen.getByRole('searchbox', { name: 'Global Search' })).toBeInTheDocument()
		expect(screen.getByRole('searchbox', { name: 'Filter' })).toBeInTheDocument()

		rerender(<NativeComparisonFixture fixture='oss-number-field' />)
		const interval = screen.getByRole('textbox', { name: '同步间隔（分钟）' })
		fireEvent.click(screen.getByRole('button', { name: /增加同步间隔/ }))
		expect(interval).toHaveValue('16')
	})

	it('第十批复用复杂控件公共状态，并在切换 fixture 时清理 Portal', async () => {
		const { rerender } = render(<NativeComparisonFixture fixture='complex-overlays' />)
		fireEvent.click(screen.getByRole('button', { name: '打开 Modal' }))
		expect(await screen.findByRole('dialog', { name: '编辑任务' })).toBeInTheDocument()

		rerender(<NativeComparisonFixture fixture='complex-navigation' />)
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '编辑任务' })).not.toBeInTheDocument(),
		)
		expect(screen.getByRole('button', { name: /详情与诊断/ })).toHaveAttribute(
			'aria-expanded',
			'true',
		)

		rerender(<NativeComparisonFixture fixture='complex-action-bar' />)
		const actionBar = screen.getByRole('toolbar', { name: '批量操作样本' })
		expect(actionBar).toHaveTextContent('2')
		expect(actionBar).not.toHaveTextContent('已选')
		expect(within(actionBar).getAllByRole('separator')).toHaveLength(3)
	})

	it('第十四批原生候选复用与 Current 相同的标签数据', () => {
		render(<NativeComparisonFixture fixture='candidate-tag-group' />)

		expect(screen.getByText('Bug')).toBeInTheDocument()
		expect(screen.getByText('123')).toBeInTheDocument()
		expect(screen.getByText('Feature')).toBeInTheDocument()
		expect(screen.getByText('Improvement')).toBeInTheDocument()
	})

	it('用两个具名 iframe 隔离 Upstream 与 Token，并只在父文档挂载一个 Current fixture', () => {
		document.documentElement.dataset.accent = 'ocean'
		render(<NativeComparison fixture='button' />)

		const upstream = screen.getByTitle('Upstream · Button 隔离对照')
		const token = screen.getByTitle('Token · Button 隔离对照')
		expect(upstream).toHaveAttribute(
			'src',
			'/ui-lab-baseline.html?mode=upstream&fixture=button&accent=ocean',
		)
		expect(token).toHaveAttribute(
			'src',
			'/ui-lab-baseline.html?mode=token&fixture=button&accent=ocean',
		)
		expect(screen.getAllByText(/正在加载 .* 对照/)).toHaveLength(2)
		fireEvent.load(upstream)
		fireEvent.load(token)
		expect(screen.queryByText(/正在加载 .* 对照/)).not.toBeInTheDocument()
		const current = document.querySelector('[data-native-comparison-current="button"]')
		expect(current).not.toBeNull()
		expect(
			within(current as HTMLElement).getByRole('button', { name: '主要操作' }),
		).toBeInTheDocument()
		expect(document.querySelectorAll('[data-native-comparison-current]')).toHaveLength(1)
	})

	it('Tooltip Portal 留在 Current document，并在对照卸载时清理', async () => {
		const { unmount } = render(<NativeComparison fixture='tooltip' />)
		const current = document.querySelector('[data-native-comparison-current="tooltip"]')
		const trigger = within(current as HTMLElement).getByRole('button', { name: '聚焦或悬停' })
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger.focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('也可以按 ⌘ K 打开命令面板')

		unmount()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})
