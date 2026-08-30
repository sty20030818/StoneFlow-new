import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { HEROUI_REGISTRATIONS } from './catalog/heroUiRegistrations'
import {
	STONEFLOW_CATALOG_REGISTRATIONS,
	STONEFLOW_PRODUCT_SCENE_REGISTRATIONS,
} from './catalog/stoneFlowRegistrations'
import { UiLabApp } from './UiLabApp'
import { UI_LAB_CATALOG, UI_LAB_REVIEW_BATCHES } from './uiLabCatalog'

describe('UiLabApp', () => {
	it('每个审查单元只属于一个批次，总账条目无需进入批次', () => {
		const entries = UI_LAB_REVIEW_BATCHES.flatMap((batch) => batch.entries)
		const catalogIds = UI_LAB_CATALOG.map((entry) => entry.id)
		const reviewUnitIds = UI_LAB_CATALOG.filter((entry) => entry.entryKind === 'review-unit')
			.map((entry) => entry.id)
			.sort()
		const reviewIds = entries.map((entry) => entry.sampleId).sort()

		expect(new Set(catalogIds).size).toBe(catalogIds.length)
		expect(new Set(reviewIds).size).toBe(reviewIds.length)
		expect(reviewIds).toEqual(reviewUnitIds)
		expect(reviewIds.every((id) => catalogIds.includes(id))).toBe(true)
		expect(
			UI_LAB_CATALOG.filter((entry) => entry.entryKind === 'ledger-only').every(
				(entry) => !reviewIds.includes(entry.id),
			),
		).toBe(true)
		expect(
			UI_LAB_CATALOG.filter((entry) => entry.entryKind === 'review-unit').every((entry) =>
				(entry.inventoryRefs ?? []).every((inventoryId) => catalogIds.includes(inventoryId)),
			),
		).toBe(true)
		expect(
			UI_LAB_REVIEW_BATCHES.slice(0, 8).every((batch) =>
				batch.entries
					.filter((entry) => entry.status !== 'external')
					.every((entry) => entry.status === 'done'),
			),
		).toBe(true)
		expect(UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-09')?.entries).toHaveLength(9)
		expect(
			UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-09')?.entries.every(
				(entry) => entry.status === 'pending',
			),
		).toBe(true)
		expect(UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-10')?.entries).toHaveLength(10)
		expect(
			UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-10')?.entries.every(
				(entry) => entry.status === 'pending',
			),
		).toBe(true)
		expect(UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-11')?.entries).toHaveLength(10)
		expect(
			UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-11')?.entries.every(
				(entry) => entry.status === 'pending',
			),
		).toBe(true)
		expect(UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-12')?.entries).toHaveLength(9)
		expect(
			UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-12')?.entries.every(
				(entry) => entry.status === 'pending',
			),
		).toBe(true)
		expect(
			UI_LAB_REVIEW_BATCHES.some((batch) =>
				batch.entries.some((entry) => entry.status === 'external'),
			),
		).toBe(true)
	})

	it('第十二批复用真实边界，并区分产品合同、组合覆盖与标签候选', () => {
		const sampleIds =
			UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-12')?.entries.map(
				(entry) => entry.sampleId,
			) ?? []
		const samples = sampleIds.map((id) => UI_LAB_CATALOG.find((entry) => entry.id === id)!)
		const labels = samples.find(
			(sample) => sample.id === 'stoneflow-task-collection-labels-review',
		)!

		expect(samples).toHaveLength(9)
		expect(samples.filter((sample) => sample.coverage === 'rendered')).toHaveLength(7)
		expect(samples.filter((sample) => sample.coverage === 'covered-in-composition')).toHaveLength(2)
		for (const id of [
			'stoneflow-task-collection-global-search-review',
			'stoneflow-task-collection-activity-review',
		]) {
			expect(samples.find((sample) => sample.id === id)).toMatchObject({
				coverage: 'covered-in-composition',
				reason: expect.any(String),
			})
		}
		expect(
			samples
				.filter((sample) => sample !== labels)
				.every(
					(sample) =>
						sample.owner === 'Product' &&
						sample.recommendedOwner === 'Product' &&
						sample.disposition === 'keep' &&
						Boolean(sample.definitionPath) &&
						Boolean(sample.consumers?.length) &&
						Boolean(sample.compositionParent) &&
						Boolean(sample.ingredients?.length),
				),
		).toBe(true)
		expect(labels).toMatchObject({
			owner: 'UI Lab fixture / HeroUI OSS',
			recommendedOwner: 'Product',
			disposition: 'candidate',
			definitionPath: null,
			consumers: null,
			compositionParent: null,
			ingredients: [
				'heroui-oss-chip',
				'heroui-oss-dropdown',
				'heroui-oss-checkbox',
				'heroui-search-field-candidate',
			],
		})
	})

	it('第十一批保持 Product 所有权，并区分真实预览与运行时边界', () => {
		const sampleIds =
			UI_LAB_REVIEW_BATCHES.find((batch) => batch.id === 'batch-11')?.entries.map(
				(entry) => entry.sampleId,
			) ?? []
		const samples = sampleIds.map((id) => UI_LAB_CATALOG.find((entry) => entry.id === id)!)

		expect(samples).toHaveLength(10)
		expect(
			samples.every(
				(sample) =>
					sample.owner === 'Product' &&
					sample.recommendedOwner === 'Product' &&
					sample.disposition === 'keep',
			),
		).toBe(true)
		expect(samples.filter((sample) => sample.coverage === 'rendered')).toHaveLength(7)
		expect(samples.filter((sample) => sample.coverage === 'covered-in-composition')).toHaveLength(2)
		expect(samples.filter((sample) => sample.coverage === 'real-app-only')).toHaveLength(1)
		expect(
			samples.every(
				(sample) =>
					Boolean(sample.definitionPath) &&
					Boolean(sample.consumers?.length) &&
					Boolean(sample.compositionParent) &&
					sample.ingredients !== null,
			),
		).toBe(true)
		expect(
			UI_LAB_CATALOG.find((entry) => entry.id === 'stoneflow-shared-settings-toggle-row-review')
				?.ingredients,
		).toEqual(['heroui-pro-cell-switch'])
		expect(
			UI_LAB_CATALOG.find((entry) => entry.id === 'stoneflow-shared-shell-sidebar-review'),
		).toMatchObject({
			coverage: 'real-app-only',
			ingredients: expect.arrayContaining(['heroui-pro-sidebar']),
		})
	})

	it('第十批区分独立对照、组合覆盖、候选与 ledger-only', () => {
		const collections = UI_LAB_CATALOG.find(
			(entry) => entry.id === 'heroui-complex-collections-review',
		)
		const cells = UI_LAB_CATALOG.find((entry) => entry.id === 'heroui-complex-cell-controls-review')
		const sidebar = UI_LAB_CATALOG.find((entry) => entry.id === 'heroui-pro-sidebar')

		expect(collections).toMatchObject({
			coverage: 'rendered',
			adoption: 'used',
			ingredients: ['heroui-list-view', 'heroui-oss-table'],
		})
		expect(cells).toMatchObject({
			coverage: 'rendered',
			adoption: 'used',
			ingredients: ['heroui-pro-cell-switch', 'heroui-pro-cell-select', 'heroui-pro-inline-select'],
		})
		expect(sidebar).toMatchObject({
			entryKind: 'ledger-only',
			coverage: 'covered-in-composition',
			adoption: 'used',
		})
		for (const family of [
			'ActionBar',
			'CellSelect',
			'CellSwitch',
			'Command',
			'ContextMenu',
			'EmptyState',
			'ListView',
			'Resizable',
			'Sheet',
			'Sidebar',
			'Timeline',
		]) {
			expect(
				UI_LAB_CATALOG.find(
					(entry) => entry.family === family && entry.sourcePackage === '@heroui-pro/react',
				),
			).toMatchObject({ adoption: 'used' })
		}
	})

	it('第九批从总账派生真实消费者，并保持原生候选与人工审查边界', () => {
		const searchField = UI_LAB_CATALOG.find(
			(entry) => entry.id === 'heroui-oss-search-field-review',
		)
		const autocomplete = UI_LAB_CATALOG.find(
			(entry) => entry.id === 'heroui-oss-combobox-autocomplete-review',
		)

		expect(searchField).toMatchObject({
			owner: 'Recipe',
			recommendedOwner: 'Recipe',
			disposition: 'keep',
			coverage: 'rendered',
		})
		expect(searchField?.consumers).toEqual([
			'src/features/filter/components/FilterMenu.tsx',
			'src/features/filter/components/FilterValueSubMenu.tsx',
			'src/features/global-search/components/GlobalSearchInput.tsx',
		])
		expect(autocomplete).toMatchObject({
			owner: 'Upstream',
			recommendedOwner: 'Upstream',
			disposition: 'candidate',
			consumers: [],
		})
	})

	it('完整登记 StoneFlow 与锁定版 HeroUI 能力，且组合链接没有悬空', () => {
		const catalogIds = new Set(UI_LAB_CATALOG.map((entry) => entry.id))
		const heroUIKeys = HEROUI_REGISTRATIONS.map(
			(entry) => `${entry.packageName}#${entry.family}#${entry.exportKind}`,
		)
		const stoneFlowIds = new Set(STONEFLOW_CATALOG_REGISTRATIONS.map((entry) => entry.id))

		expect(new Set(heroUIKeys).size).toBe(heroUIKeys.length)
		expect(new Set(stoneFlowIds).size).toBe(STONEFLOW_CATALOG_REGISTRATIONS.length)
		expect(HEROUI_REGISTRATIONS.every((entry) => catalogIds.has(entry.id))).toBe(true)
		expect(STONEFLOW_CATALOG_REGISTRATIONS.every((entry) => catalogIds.has(entry.id))).toBe(true)
		expect(
			STONEFLOW_CATALOG_REGISTRATIONS.every(
				(entry) => !entry.compositionParent || stoneFlowIds.has(entry.compositionParent),
			),
		).toBe(true)
		expect(
			STONEFLOW_CATALOG_REGISTRATIONS.every((entry) =>
				entry.ingredients.every((ingredient) => catalogIds.has(ingredient)),
			),
		).toBe(true)
		expect(
			STONEFLOW_CATALOG_REGISTRATIONS.find((entry) => entry.id === 'stoneflow-row-shell')
				?.consumers,
		).toEqual([
			'src/features/lifecycle/components/LifecycleRowAdapter.tsx',
			'src/features/project/components/ProjectRowAdapter.tsx',
			'src/features/task/components/TaskRowAdapter.tsx',
		])
		for (const [name, definitionPath] of [
			['PriorityIcon', 'src/features/task/model/indicators/PriorityIcon.tsx'],
			['TaskStatusIndicator', 'src/features/task/model/indicators/TaskStatusIndicator.tsx'],
			['RouterFeedbackPage', 'src/routes/-router-feedback.tsx'],
		]) {
			expect(STONEFLOW_CATALOG_REGISTRATIONS).toContainEqual(
				expect.objectContaining({ name, definitionPath }),
			)
		}

		for (const family of [
			'ColorSwatchPicker',
			'Disclosure',
			'ProgressCircle',
			'ScrollShadow',
			'Surface',
			'ActionBar',
			'CellSelect',
			'CellSwitch',
			'Resizable',
			'Timeline',
		]) {
			expect(HEROUI_REGISTRATIONS.some((entry) => entry.family === family)).toBe(true)
		}
		expect(HEROUI_REGISTRATIONS.find((entry) => entry.family === 'SearchField')).toMatchObject({
			adoption: 'used',
		})
		expect(HEROUI_REGISTRATIONS.find((entry) => entry.family === 'Breadcrumbs')).toMatchObject({
			adoption: 'used',
		})
		expect(
			HEROUI_REGISTRATIONS.find((entry) => entry.id === 'heroui-oss-toast-function'),
		).toMatchObject({ exportKind: 'function', adoption: 'used' })
		expect(
			HEROUI_REGISTRATIONS.find((entry) => entry.id === 'heroui-oss-selection-type'),
		).toMatchObject({ exportKind: 'type', adoption: 'used' })
		expect(STONEFLOW_PRODUCT_SCENE_REGISTRATIONS.length).toBeGreaterThanOrEqual(9)
		for (const sceneId of [
			'stoneflow-scene-shell',
			'stoneflow-scene-task-board',
			'stoneflow-scene-task-detail',
			'stoneflow-scene-global-search',
			'stoneflow-scene-settings-sync',
			'stoneflow-scene-entity-detail',
			'stoneflow-scene-launcher',
			'stoneflow-scene-feedback-recovery',
			'stoneflow-scene-space-editor',
		]) {
			expect(
				STONEFLOW_PRODUCT_SCENE_REGISTRATIONS.find(
					(entry) => entry.id === sceneId,
				)?.ingredients.some((ingredient) => ingredient.startsWith('heroui-')),
			).toBe(true)
		}
	})

	it('当前批次没有目标视图样例时回到该视图的分类目录', () => {
		render(<UiLabApp />)

		fireEvent.click(screen.getByRole('button', { name: /第五批 · 元数据与 Task Board/ }))
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI' }))

		expect(screen.getByRole('button', { name: '按分类' })).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByRole('button', { name: 'HeroUI' })).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByRole('heading', { name: 'HeroUI Button' })).toBeInTheDocument()
		expect(document.querySelector('[data-native-comparison="button"]')).toBeInTheDocument()
	})

	it('第七批 Context Menu 保留游标坐标锚点并支持触屏长按', () => {
		render(<UiLabApp />)

		fireEvent.click(screen.getByRole('button', { name: /第七批 · 浮层与焦点/ }))
		fireEvent.click(screen.getByRole('button', { name: /Context Menu.*Lab 审查完成/ }))
		const preview = screen.getByRole('region', { name: '当前样例预览' })
		const trigger = preview.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]')
		expect(trigger).not.toBeNull()
		expect(trigger).toHaveClass('context-menu__trigger')

		vi.spyOn(trigger!, 'getBoundingClientRect').mockReturnValue({
			bottom: 160,
			height: 80,
			left: 100,
			right: 300,
			top: 80,
			width: 200,
			x: 100,
			y: 80,
			toJSON: () => ({}),
		})

		vi.useFakeTimers()
		try {
			fireEvent.touchStart(trigger!, {
				touches: [{ clientX: 140, clientY: 110 }],
			})
			act(() => vi.advanceTimersByTime(500))

			const anchor = trigger!.querySelector<HTMLElement>('[aria-hidden="true"]')
			expect(anchor).toHaveStyle({ left: '40px', top: '30px' })
			expect(screen.getByRole('menu', { name: '任务上下文菜单' })).toBeInTheDocument()
		} finally {
			vi.useRealTimers()
		}
	})

	it('第五批用标签下拉维护已选标签', async () => {
		render(<UiLabApp />)

		fireEvent.click(screen.getByRole('button', { name: /第五批 · 元数据与 Task Board/ }))
		fireEvent.click(screen.getByRole('button', { name: /Labels.*Lab 审查完成/ }))
		expect(screen.getByRole('status')).toHaveTextContent('已选择标签：Bug、123')

		fireEvent.click(screen.getByRole('button', { name: '编辑任务标签' }))
		const menu = await screen.findByRole('menu', { name: '编辑任务标签' })
		expect(screen.getByText('L')).toBeInTheDocument()
		const selectedGroup = within(menu).getByRole('group', { name: '已选择' })
		const availableGroup = screen.getByRole('group', { name: '可添加' })
		expect(within(selectedGroup).getByRole('menuitemcheckbox', { name: 'Bug' })).toBeChecked()
		expect(within(selectedGroup).getByRole('menuitemcheckbox', { name: '123' })).toBeChecked()
		const feature = within(availableGroup).getByRole('menuitemcheckbox', { name: 'Feature' })
		const featureCheckbox = feature.querySelector<HTMLElement>('[data-slot="checkbox"]')
		expect(featureCheckbox).not.toBeNull()
		fireEvent.pointerDown(featureCheckbox!)
		fireEvent.click(featureCheckbox!)
		expect(screen.getByRole('menu', { name: '编辑任务标签' })).toBeInTheDocument()
		await waitFor(() =>
			expect(
				within(screen.getByRole('group', { name: '已选择' })).getByRole('menuitemcheckbox', {
					name: 'Feature',
				}),
			).toBeChecked(),
		)
		expect(within(menu).queryByText('已选择')).not.toBeInTheDocument()
		expect(within(menu).queryByText('可添加')).not.toBeInTheDocument()
		const improvement = within(screen.getByRole('group', { name: '可添加' })).getByRole(
			'menuitemcheckbox',
			{ name: 'Improvement' },
		)
		fireEvent.pointerDown(improvement)
		fireEvent.click(improvement)
		expect(screen.getByRole('status')).toHaveTextContent('已选择标签：Bug、123、Feature')
		await waitFor(() =>
			expect(screen.queryByRole('menu', { name: '编辑任务标签' })).not.toBeInTheDocument(),
		)
		expect(screen.getByRole('status')).toHaveTextContent(
			'已选择标签：Bug、123、Feature、Improvement',
		)

		fireEvent.click(screen.getByRole('button', { name: /第四批 · 集合与任务行/ }))
		fireEvent.click(screen.getByRole('button', { name: /Menu.*Lab 审查完成/ }))
		fireEvent.click(screen.getByRole('button', { name: '操作菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /打开任务/ }))
		await waitFor(() =>
			expect(screen.queryByRole('menu', { name: '任务操作菜单' })).not.toBeInTheDocument(),
		)
	})

	it('第十一批 Space Editor 使用公开产品组件且提交不写入业务状态', async () => {
		render(<UiLabApp />)

		fireEvent.click(screen.getByRole('button', { name: /第十一批 · StoneFlow 共享产品组件/ }))
		fireEvent.click(screen.getByRole('button', { name: /Space Editor 组件.*待审查/ }))
		fireEvent.click(screen.getByRole('button', { name: '打开 Space Editor' }))
		expect(await screen.findByRole('dialog', { name: '新建 Space' })).toBeInTheDocument()

		fireEvent.change(screen.getByRole('textbox', { name: '名称' }), {
			target: { value: '审查空间' },
		})
		fireEvent.click(screen.getByRole('button', { name: '创建 Space' }))

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '新建 Space' })).not.toBeInTheDocument(),
		)
		expect(screen.getByText(/已提交：审查空间；Lab 不写入数据库/)).toBeInTheDocument()
	})

	it('第十二批 Bulk ActionBar 只修改本地选择状态', async () => {
		render(<UiLabApp />)

		fireEvent.click(screen.getByRole('button', { name: /第十二批 · Task 与集合组合/ }))
		fireEvent.click(screen.getByRole('button', { name: /Bulk ActionBar · 产品合同.*待审查/ }))
		expect(await screen.findByRole('toolbar', { name: '批量操作' })).toHaveTextContent('已选 3 项')

		fireEvent.click(screen.getByRole('button', { name: '清空已选' }))
		await waitFor(() =>
			expect(screen.queryByRole('toolbar', { name: '批量操作' })).not.toBeInTheDocument(),
		)
		expect(screen.getByText('已清空本地选择')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '恢复 3 项选择' }))
		expect(await screen.findByRole('toolbar', { name: '批量操作' })).toHaveTextContent('已选 3 项')
	})

	it('第十二批 Task Metadata 通过生产公开组件更新本地优先级', async () => {
		render(<UiLabApp />)

		fireEvent.click(screen.getByRole('button', { name: /第十二批 · Task 与集合组合/ }))
		fireEvent.click(screen.getByRole('button', { name: /Task Metadata · 产品合同.*待审查/ }))
		expect(screen.getByText('当前优先级：中')).toBeInTheDocument()

		const priorityButton = screen.getByRole('button', { name: '优先级' })
		expect(priorityButton.querySelector('svg')).not.toBeNull()
		fireEvent.click(priorityButton)
		fireEvent.click(await screen.findByRole('menuitem', { name: /高/ }))
		expect(screen.getByText('当前优先级：高')).toBeInTheDocument()
	})

	it('通过同一工作台完成双视图、批次、分类、搜索、单预览与键盘路径', async () => {
		render(<UiLabApp />)

		const preview = screen.getByRole('region', { name: '当前样例预览' })
		expect(screen.getByRole('button', { name: 'StoneFlow' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
		expect(screen.getByRole('button', { name: '按批次' })).toHaveAttribute('aria-pressed', 'true')
		for (const batchName of [
			/第一批 · 基础与动作/,
			/第二批 · 表单与选择/,
			/第三批 · 导航/,
			/第四批 · 集合与任务行/,
			/第五批 · 元数据与 Task Board/,
			/第六批 · 反馈与 Launcher/,
			/第七批 · 浮层与焦点/,
			/第八批 · 组合与桌面边界/,
			/第九批 · HeroUI 原子与表单/,
			/第十批 · HeroUI 复杂控件/,
			/第十一批 · StoneFlow 共享产品组件/,
			/第十二批 · Task 与集合组合/,
		]) {
			expect(screen.getByRole('button', { name: batchName })).toBeInTheDocument()
		}
		expect(screen.getByRole('button', { name: /第一批 · 基础与动作/ })).toHaveTextContent('6/6')
		expect(screen.getByRole('button', { name: /第三批 · 导航/ })).toHaveTextContent('6/6')
		expect(screen.getByRole('button', { name: /第五批 · 元数据与 Task Board/ })).toHaveTextContent(
			'6/6',
		)
		expect(screen.getByRole('button', { name: /第六批 · 反馈与 Launcher/ })).toHaveTextContent(
			'6/6',
		)
		expect(screen.getByRole('button', { name: /第七批 · 浮层与焦点/ })).toHaveTextContent('10/10')
		expect(screen.getByRole('button', { name: /第八批 · 组合与桌面边界/ })).toHaveTextContent('3/3')
		fireEvent.click(screen.getByRole('button', { name: /第四批 · 集合与任务行/ }))
		expect(screen.getByRole('button', { name: /RowShell.*Lab 审查完成/ })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /Table.*待审查/ })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: /第一批 · 基础与动作/ }))
		fireEvent.click(screen.getByRole('button', { name: '按分类' }))

		for (const categoryName of [
			'Foundations',
			'Actions',
			'Fields',
			'Navigation',
			'Collections',
			'Feedback',
			'Overlays',
			'Product Scenes',
		]) {
			expect(screen.getByRole('button', { name: categoryName })).toBeInTheDocument()
		}
		fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
		expect(screen.getByRole('button', { name: '全部' })).toHaveAttribute('aria-pressed', 'true')
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

		const search = screen.getByRole('searchbox', { name: '搜索目录' })
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
		const reminderCheckbox = within(preview).getByRole('checkbox', {
			name: 'Secondary（灰底无阴影）',
		})
		fireEvent.click(reminderCheckbox)
		expect(reminderCheckbox).toBeChecked()
		const partialSelection = within(preview).getByRole('checkbox', {
			name: '部分项目已选择（半选）',
		})
		expect(partialSelection).toBePartiallyChecked()
		fireEvent.click(partialSelection)
		expect(partialSelection).toBeChecked()
		expect(partialSelection).not.toBePartiallyChecked()
		fireEvent.click(partialSelection)
		expect(partialSelection).not.toBeChecked()
		const backgroundSync = within(preview).getByRole('switch', { name: '后台同步' })
		const backgroundSyncControl = backgroundSync
			.closest('[data-slot="switch-content"]')
			?.querySelector('[data-slot="switch-control"]')
		expect(backgroundSyncControl).not.toBeNull()
		expect(backgroundSync).toBeChecked()
		fireEvent.click(backgroundSync)
		expect(backgroundSync).not.toBeChecked()
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
			const saveFailure = within(preview).getByRole('alert')
			expect(saveFailure).toHaveTextContent('保存失败')
			expect(saveFailure).toHaveClass('alert--danger')
			expect(within(saveFailure).getByRole('button', { name: '重试保存' })).toHaveClass(
				'button--danger',
			)

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
		fireEvent.click(screen.getByRole('button', { name: 'Settings Navigation' }))
		expect(screen.getByText('src/features/settings/index.ts')).toBeInTheDocument()
		expect(
			within(preview).getByText(
				/SettingsSidebar 依赖真实 TanStack Router、当前 Scope、返回路径与持久化分区状态/,
			),
		).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Sidebar' }))
		const compactSidebar = within(preview).getByRole('treegrid', {
			name: 'StoneFlow 36px token 侧边栏',
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

		fireEvent.click(screen.getByRole('button', { name: 'Overlays' }))
		for (const sampleName of [
			'Tooltip',
			'Dropdown',
			'Popover',
			'Context Menu',
			'Modal',
			'AlertDialog',
			'Sheet',
		]) {
			expect(screen.getByRole('button', { name: sampleName })).toBeInTheDocument()
		}
		expect(within(preview).getByRole('heading', { name: 'Tooltip' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Popover' }))
		fireEvent.click(within(preview).getByRole('button', { name: '打开排序说明' }))
		expect(screen.getByRole('dialog', { name: '任务排序说明' })).toBeInTheDocument()
		expect(document.querySelectorAll('[data-ui-lab-preview-root]')).toHaveLength(1)

		fireEvent.click(screen.getByRole('button', { hidden: true, name: 'Sheet' }))
		expect(screen.queryByRole('dialog', { name: '任务排序说明' })).not.toBeInTheDocument()
		expect(within(preview).getByRole('heading', { name: 'Sheet' })).toBeInTheDocument()
		expect(within(preview).queryByRole('heading', { name: 'Popover' })).not.toBeInTheDocument()
		expect(document.querySelectorAll('[data-ui-lab-preview-root]')).toHaveLength(1)
		fireEvent.change(search, { target: { value: 'Task Detail' } })
		fireEvent.click(screen.getByRole('button', { name: 'Task Detail 焦点' }))
		expect(within(preview).getByRole('heading', { name: 'Task Detail 焦点' })).toBeInTheDocument()
		expect(within(preview).queryByRole('heading', { name: 'Sheet' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Feedback' }))
		for (const sampleName of [
			'Empty / Error / Retry',
			'Skeleton / Spinner / Progress',
			'Alert / Toast',
			'Disabled / Invalid / Danger / Save',
		]) {
			expect(screen.getByRole('button', { name: sampleName })).toBeInTheDocument()
		}
		expect(within(preview).getByRole('heading', { name: '这里还没有任务' })).toBeInTheDocument()
		const emptyRecoveryStatus = within(preview).getByRole('status')
		const emptyStateControl = within(preview).getByRole('button', { name: '显示空状态' })
		fireEvent.click(within(preview).getByRole('button', { name: '创建演示任务' }))
		expect(emptyRecoveryStatus).toHaveTextContent('恢复完成')
		expect(emptyStateControl).toHaveFocus()
		fireEvent.click(emptyStateControl)
		fireEvent.click(within(preview).getByRole('button', { name: '模拟加载失败' }))
		expect(within(preview).getByRole('alert')).toHaveTextContent('任务列表加载失败')
		fireEvent.click(within(preview).getByRole('button', { name: '重试' }))
		expect(within(preview).getByText('已在本地恢复')).toBeInTheDocument()
		expect(emptyRecoveryStatus).toHaveTextContent('恢复完成')
		expect(emptyStateControl).toHaveFocus()

		fireEvent.click(screen.getByRole('button', { name: 'Skeleton / Spinner / Progress' }))
		expect(within(preview).getAllByRole('progressbar')).toHaveLength(2)
		expect(within(preview).getByText('48%')).toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '推进 20%' }))
		expect(within(preview).getByText('68%')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Alert / Toast' }))
		fireEvent.click(within(preview).getByRole('button', { name: '触发当前 Toast' }))
		expect(screen.getByText('Toast · 工作区有可用更新')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '关闭提示' }))
		await waitFor(() =>
			expect(screen.queryByText('Toast · 工作区有可用更新')).not.toBeInTheDocument(),
		)
		fireEvent.click(within(preview).getByRole('button', { name: '触发当前 Toast' }))
		expect(screen.getByText('Toast · 工作区有可用更新')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Disabled / Invalid / Danger / Save' }))
		await waitFor(() =>
			expect(screen.queryByText('Toast · 工作区有可用更新')).not.toBeInTheDocument(),
		)
		const requiredTitle = within(preview).getByRole('textbox', { name: '任务标题（必填）' })
		expect(requiredTitle).toHaveAttribute('aria-invalid', 'true')
		expect(
			within(preview).getByText('请输入任务标题；错误不只通过边框颜色表达。'),
		).toBeInTheDocument()
		fireEvent.change(requiredTitle, { target: { value: '完善同步恢复规则' } })
		await waitFor(() => expect(requiredTitle).not.toHaveAttribute('aria-invalid', 'true'))
		expect(
			within(preview).queryByText('请输入任务标题；错误不只通过边框颜色表达。'),
		).not.toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '保存' }))
		expect(within(preview).getByText('保存演示正在等待结果。')).toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '模拟错误' }))
		expect(within(preview).getByRole('alert')).toHaveTextContent('保存失败')
		fireEvent.click(within(preview).getByRole('button', { name: '重试保存' }))
		expect(within(preview).getByText('已保存本地演示状态；刷新后不会保留。')).toBeInTheDocument()

		fireEvent.change(search, { target: { value: 'Launcher' } })
		fireEvent.click(screen.getByRole('button', { name: 'Launcher：搜索、创建与恢复' }))
		const launcherSearch = within(preview).getByRole('searchbox', { name: '搜索或创建任务' })
		fireEvent.change(launcherSearch, { target: { value: '不存在的长任务' } })
		expect(within(preview).getByRole('heading', { name: '没有匹配的任务' })).toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '创建“不存在的长任务”' }))
		expect(within(preview).getByText('已在 fixture 中创建：不存在的长任务')).toBeInTheDocument()
		const launcherErrorControl = within(preview).getByRole('button', {
			name: '模拟搜索错误',
		})
		fireEvent.click(launcherErrorControl)
		expect(within(preview).getByRole('alert')).toHaveTextContent('Launcher 搜索失败')
		fireEvent.click(within(preview).getByRole('button', { name: '重试搜索' }))
		expect(within(preview).getByRole('list', { name: 'Launcher 任务结果' })).toBeInTheDocument()
		expect(within(preview).getByRole('status')).toHaveTextContent('搜索已恢复')
		expect(launcherErrorControl).toHaveFocus()
		expect(within(preview).getByText(/原生窗口激活、全局快捷键/)).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Collections' }))
		for (const sampleName of [
			'RowShell',
			'Menu',
			'ListBox',
			'ListView',
			'Table',
			'Labels',
			'Chip',
			'Badge',
			'Avatar',
			'Task Row',
			'Group Header',
			'Task Board',
		]) {
			expect(screen.getByRole('button', { name: sampleName })).toBeInTheDocument()
		}
		expect(within(preview).getByRole('heading', { name: 'RowShell' })).toBeInTheDocument()
		const normalRow = within(preview).getByRole('row', { name: '普通事项' })
		const selectedRow = within(preview).getByRole('row', { name: '选中事项' })
		normalRow.focus()
		fireEvent.keyDown(normalRow, { key: 'ArrowDown' })
		expect(selectedRow).toHaveFocus()
		expect(normalRow).toHaveAttribute('tabindex', '-1')
		expect(selectedRow).toHaveAttribute('tabindex', '0')
		fireEvent.click(normalRow)
		expect(within(preview).getByRole('status')).toHaveTextContent('当前行：普通事项')
		expect(normalRow).toHaveAttribute('aria-selected', 'true')
		fireEvent.click(within(preview).getByRole('button', { name: '更多操作：含尾部操作' }))
		expect(within(preview).getByRole('status')).toHaveTextContent('已触发：含尾部操作')

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
		const menuTrigger = within(preview).getByRole('button', { name: '操作菜单' })
		fireEvent.click(menuTrigger)
		const menuSearch = await screen.findByRole('searchbox', { name: '搜索任务操作' })
		fireEvent.change(menuSearch, { target: { value: '回收站' } })
		expect(screen.getByRole('menuitem', { name: /移到回收站/ })).toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: /打开任务/ })).not.toBeInTheDocument()
		fireEvent.keyDown(menuSearch, { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('searchbox', { name: '搜索任务操作' })).not.toBeInTheDocument(),
		)
		expect(menuTrigger).toHaveFocus()

		fireEvent.click(screen.getByRole('button', { name: 'Task Row' }))
		const firstSelectedTask = within(preview)
			.getByRole('checkbox', { name: /选择任务：把跨窗口同步失败/ })
			.closest('[data-row-shell]')
		const secondSelectedTask = within(preview)
			.getByRole('checkbox', { name: '选择任务：连续选中分组的中间任务' })
			.closest('[data-row-shell]')
		const thirdSelectedTask = within(preview)
			.getByRole('checkbox', { name: '选择任务：简短任务标题' })
			.closest('[data-row-shell]')
		expect(firstSelectedTask).toHaveAttribute('data-selection-group-position', 'first')
		expect(secondSelectedTask).toHaveAttribute('data-selection-group-position', 'middle')
		expect(thirdSelectedTask).toHaveAttribute('data-selection-group-position', 'last')
		fireEvent.click(within(preview).getByRole('checkbox', { name: /选择任务：把跨窗口同步失败/ }))
		expect(secondSelectedTask).toHaveAttribute('data-selection-group-position', 'first')
		expect(thirdSelectedTask).toHaveAttribute('data-selection-group-position', 'last')

		fireEvent.change(search, { target: { value: 'Task Board' } })
		fireEvent.click(screen.getByRole('button', { name: 'Task Board' }))
		expect(within(preview).getByRole('heading', { name: 'Task Board' })).toBeInTheDocument()
		const wideBoard = within(preview).getByRole('region', {
			name: '宽容器 · 560px 及以上',
		})
		expect(wideBoard).toBeInTheDocument()
		expect(within(preview).getByRole('region', { name: '紧凑容器 · 520px' })).toBeInTheDocument()
		expect(within(preview).queryByRole('heading', { name: 'RowShell' })).not.toBeInTheDocument()
		let groupHeader = within(wideBoard).getByRole('button', { name: '折叠 进行中' })
		const groupContent = document.getElementById(groupHeader.getAttribute('aria-controls')!)
		expect(groupContent).not.toHaveAttribute('hidden')
		fireEvent.click(groupHeader)
		expect(groupHeader).toHaveAttribute('aria-expanded', 'false')
		expect(groupContent).toHaveAttribute('hidden')
		expect(
			within(wideBoard).queryByRole('button', {
				name: '切换状态：审查当前组件的键盘焦点与尾部动作',
			}),
		).not.toBeInTheDocument()
		groupHeader = within(wideBoard).getByRole('button', { name: '展开 进行中' })
		fireEvent.doubleClick(groupHeader.closest('[data-ui-lab-group-header]')!)
		groupHeader = within(wideBoard).getByRole('button', { name: '折叠 进行中' })
		expect(groupHeader).toHaveAttribute('aria-expanded', 'true')
		expect(groupContent).not.toHaveAttribute('hidden')
		expect(document.querySelectorAll('[data-ui-lab-preview-root]')).toHaveLength(1)

		fireEvent.change(search, { target: { value: 'Main / Launcher' } })
		const nativeWindowEntry = screen.getByRole('button', {
			name: 'Main / Launcher 原生窗口验收',
		})
		fireEvent.click(nativeWindowEntry)
		expect(within(preview).queryByRole('heading', { name: 'Task Board' })).not.toBeInTheDocument()
		expect(document.querySelectorAll('[data-ui-lab-preview-root]')).toHaveLength(0)

		const realAppOnlyFilter = screen.getByRole('button', { name: '仅真实应用' })
		fireEvent.click(realAppOnlyFilter)
		expect(realAppOnlyFilter).toHaveAttribute('aria-pressed', 'true')
		expect(
			screen.getByRole('heading', { name: 'Main / Launcher 原生窗口验收' }),
		).toBeInTheDocument()
		expect(
			screen.getByText('src/main.tsx；src/launcher.tsx；src-tauri/tauri.conf.json'),
		).toBeInTheDocument()
		expect(
			within(preview).getByText(
				/Portal 归属、WebView 激活、窗口断点、缩放与跨窗口一致性依赖真实 Tauri/,
			),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))

		const noPreviewFilter = screen.getByRole('button', { name: '无独立预览' })
		fireEvent.click(noPreviewFilter)
		expect(noPreviewFilter).toHaveAttribute('aria-pressed', 'true')
		fireEvent.click(screen.getByRole('button', { name: 'Main / Launcher 原生窗口验收' }))
		expect(
			screen.getByRole('heading', { name: 'Main / Launcher 原生窗口验收' }),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '待归属' }))
		expect(within(preview).getByText('当前分类没有待归属样例')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
		expect(screen.getByRole('button', { name: '全部' })).toHaveAttribute('aria-pressed', 'true')
		expect(within(preview).getByRole('heading', { name: 'StoneFlow Button' })).toBeInTheDocument()

		const heroUIView = screen.getByRole('button', { name: 'HeroUI' })
		act(() => heroUIView.focus())
		fireEvent.keyDown(heroUIView, { key: 'Enter' })
		fireEvent.keyUp(heroUIView, { key: 'Enter' })
		expect(heroUIView).toHaveFocus()
		expect(heroUIView).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByRole('heading', { name: 'HeroUI Button' })).toBeInTheDocument()
		expect(document.querySelector('[data-native-comparison="button"]')).toBeInTheDocument()
		expect(screen.getByTitle('Upstream · Button 隔离对照')).toBeInTheDocument()
		expect(screen.getByTitle('Token · Button 隔离对照')).toBeInTheDocument()
		expect(within(preview).queryByRole('button', { name: '新建任务' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI SearchField' }))
		const adoptedSearch = within(preview).getByRole('searchbox', {
			name: '搜索任务与项目',
		})
		fireEvent.change(adoptedSearch, { target: { value: '日期' } })
		expect(within(preview).getByText('当前查询：日期')).toBeInTheDocument()

		for (const ledgerQuery of [
			'HeroUI ColorSwatchPicker',
			'swatch',
			'@heroui/react@3.2.4',
			'SpaceEditorDialog.tsx',
		]) {
			fireEvent.change(search, { target: { value: ledgerQuery } })
			expect(screen.getByRole('button', { name: 'HeroUI ColorSwatchPicker' })).toBeInTheDocument()
			fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
		}

		fireEvent.change(search, { target: { value: 'SpaceEditorDialog.tsx' } })
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI ColorSwatchPicker' }))
		expect(screen.getByRole('heading', { name: 'HeroUI ColorSwatchPicker' })).toBeInTheDocument()
		expect(screen.getByText('由产品组合覆盖')).toBeInTheDocument()
		expect(
			screen.getByText('src/features/space/components/SpaceEditorDialog.tsx'),
		).toBeInTheDocument()
		expect(screen.getByText('生产组合（见消费位置）')).toBeInTheDocument()
		expect(screen.getByText('Keep')).toBeInTheDocument()
		expect(document.querySelectorAll('[data-ui-lab-preview-root]')).toHaveLength(0)
		expect(within(preview).getByText(/当前能力已由真实产品组合消费/)).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '按批次' }))
		expect(
			screen.queryByRole('button', { name: 'HeroUI ColorSwatchPicker' }),
		).not.toBeInTheDocument()
		expect(screen.getByRole('heading', { name: 'HeroUI Button' })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '按分类' }))

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
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI Tooltip' }))
		expect(document.querySelector('[data-native-comparison="tooltip"]')).toBeInTheDocument()
		expect(document.querySelectorAll('[data-native-comparison]')).toHaveLength(1)
		expect(screen.getByTitle('Upstream · Tooltip 隔离对照')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'HeroUI Modal' }))
		fireEvent.click(within(preview).getByRole('button', { name: '打开 Modal' }))
		expect(screen.getByRole('dialog', { name: '确认审查范围' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { hidden: true, name: '替换候选' }))
		expect(screen.queryByRole('dialog', { name: '确认审查范围' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI Autocomplete' }))
		expect(screen.getByRole('heading', { name: 'HeroUI Autocomplete' })).toBeInTheDocument()
		expect(within(preview).getByText('未在 UI Lab 渲染')).toBeInTheDocument()
		expect(screen.getByText('候选（尚未批准）')).toBeInTheDocument()

		fireEvent.change(search, { target: { value: 'DatePicker' } })
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI DatePicker' }))
		expect(within(preview).getByRole('heading', { name: 'HeroUI DatePicker' })).toBeInTheDocument()
		expect(
			within(preview).queryByRole('searchbox', { name: '搜索任务与项目' }),
		).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '探索中' }))
		expect(screen.getByRole('button', { name: 'HeroUI Accordion' })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'HeroUI Accordion' }))
		expect(within(preview).getByText(/当前无产品消费者/)).toBeInTheDocument()
		expect(screen.getByText('Upstream · 无覆盖')).toBeInTheDocument()
	})
})
