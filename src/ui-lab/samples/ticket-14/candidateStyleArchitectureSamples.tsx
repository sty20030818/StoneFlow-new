import { useMemo, useState, type ReactNode } from 'react'

import { KeybindingRegistry, ShortcutRegistryProvider } from '@/features/command'
import {
	EMPTY_FILTER_QUERY,
	ListFilterUiProvider,
	PageFilterButton,
	isFilterQueryEmpty,
	type FilterQuery,
	type ListFilterUiValue,
} from '@/features/filter'
import { MetadataFieldDropdown } from '@/features/metadata-fields'
import { PageFrame } from '@/shared/components/page-frame'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'
import { CANDIDATE_PRIORITY_OPTIONS, CANDIDATE_VIEW_OPTIONS } from '../sharedFixtureData'
import { LabelsPreview } from '../ticket-05/collectionsAndTaskSamples'

const FILTER_SHORTCUT_REGISTRY = new KeybindingRegistry([])

function CurrentEvidence({
	title,
	note,
	children,
}: {
	title: string
	note: string
	children: ReactNode
}) {
	return (
		<div className='flex w-full min-w-0 flex-col gap-4'>
			<div>
				<h3 className='text-base font-semibold'>{title}</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>{note}</p>
			</div>
			{children}
		</div>
	)
}

function HoverCardCurrentBoundary() {
	return (
		<CurrentEvidence
			note='Current 由 TaskPreview、预览 Store、Query 和 ShellMain 共同组成；复制一张静态 Card 会伪造生产生命周期。'
			title='Current · Task Preview（真实应用边界）'
		>
			<div
				className='rounded-lg border border-separator bg-surface-secondary p-4 text-sm leading-6'
				data-candidate-current-boundary='real-app-only'
			>
				<p className='font-medium'>此处不复制 TaskPreview DOM</p>
				<p className='mt-1 text-muted'>
					请在真实 Task Row 中验证键盘打开、焦点目标切换、预览内指针驻留、延迟关闭、Drawer
					抑制、查询状态与外部点击。Store 暴露的 pointer-open 能力目前没有生产调用方。
				</p>
			</div>
		</CurrentEvidence>
	)
}

function InlineSelectCurrentPreview() {
	const [priority, setPriority] = useState('medium')

	return (
		<CurrentEvidence
			note='直接渲染生产公开 MetadataFieldDropdown；候选必须保留当前视觉、快捷键和业务分支后才可能迁移。'
			title='Current · MetadataFieldDropdown'
		>
			<div className='flex flex-wrap items-center gap-2'>
				<MetadataFieldDropdown
					compact
					fieldKey='priority'
					label='优先级'
					menuLabel='设置优先级'
					onChange={setPriority}
					options={CANDIDATE_PRIORITY_OPTIONS}
					value={priority}
				/>
				<span className='text-sm text-muted'>当前：{priority}</span>
			</div>
		</CurrentEvidence>
	)
}

function SearchablePropertyMenuCurrentPreview() {
	const [effective, setEffective] = useState<FilterQuery>(EMPTY_FILTER_QUERY)
	const value = useMemo<ListFilterUiValue>(
		() => ({
			session: {
				base: EMPTY_FILTER_QUERY,
				temp: effective,
				effective,
				dirty: effective !== EMPTY_FILTER_QUERY,
				isEmpty: isFilterQueryEmpty(effective),
				setTemp: (query) => setEffective(query),
				clearTemp: () => setEffective(EMPTY_FILTER_QUERY),
				replaceEffective: (query) => setEffective(query),
			},
			projects: [{ id: 'project-ui-lab', name: 'UI Lab' }],
		}),
		[effective],
	)

	return (
		<CurrentEvidence
			note='直接渲染生产 PageFilterButton/FilterMenu，并只在 fixture 内保存 FilterQuery；不复制私有菜单 DOM。'
			title='Current · 可搜索筛选属性菜单'
		>
			<ShortcutRegistryProvider registry={FILTER_SHORTCUT_REGISTRY}>
				<ListFilterUiProvider value={value}>
					<div className='flex items-center gap-3'>
						<PageFilterButton />
						<span className='text-sm text-muted'>打开后搜索字段并进入二级值菜单</span>
					</div>
				</ListFilterUiProvider>
			</ShortcutRegistryProvider>
		</CurrentEvidence>
	)
}

function TagGroupCurrentPreview() {
	return (
		<CurrentEvidence
			note='以下是第五批已确认、在第十二批复用的 Lab 产品假设，不是生产 Current；项目目前没有标签领域模型或消费者。'
			title='Current evidence · Labels（仅 Lab）'
		>
			<LabelsPreview />
		</CurrentEvidence>
	)
}

function SegmentCurrentPreview() {
	const [selected, setSelected] = useState('all')

	return (
		<CurrentEvidence
			note='直接渲染生产公开 PageFrame；它继续拥有异步选择、窄宽换行和 Toolbar 组合合同。'
			title='Current · PageFrame Toolbar choices'
		>
			<div className='h-48 min-w-0 overflow-hidden rounded-lg border border-surface'>
				<PageFrame.Root>
					<PageFrame.Header title='任务' />
					<PageFrame.Toolbar
						onSelectionChange={setSelected}
						pills={CANDIDATE_VIEW_OPTIONS.map(({ id, label }) => ({ key: id, label }))}
						selectedKey={selected}
					/>
					<PageFrame.Body>
						<p className='text-sm text-muted'>
							当前视图：{selected === 'all' ? '全部' : '我的任务'}
						</p>
					</PageFrame.Body>
				</PageFrame.Root>
			</div>
		</CurrentEvidence>
	)
}

export const TICKET_14_SAMPLES = [
	{
		id: 'heroui-candidate-hover-card-task-preview',
		name: 'HoverCard → Task Preview',
		view: 'heroui',
		category: '替换候选',
		description:
			'候选只接管 Hover/Focus Overlay 原语；Current 实际使用键盘打开，TaskPreview 内容、查询、焦点目标同步和 Shell 位置仍是产品合同。',
		keywords: ['hover card', 'task preview', 'pointer', 'keyboard', 'real app'],
		owner: 'Product',
		recommendedOwner: 'Product',
		source:
			'@heroui-pro/react@1.0.0-beta.8；src/features/task/detail/components/TaskPreview.tsx；src/features/task/detail/model/useTaskPreviewStore.ts；src/features/task/hooks/useTaskCollectionScene.ts；src/features/task/commands/taskBulkCommandHandlers.ts；src/layout/ShellMain.tsx',
		coverage: 'rendered',
		currentCoverage: 'real-app-only',
		comparisonFixture: 'candidate-hover-card',
		Preview: HoverCardCurrentBoundary,
		inventoryRefs: ['heroui-pro-hover-card', 'stoneflow-component-task-preview'],
		disposition: 'keep',
		adoption: 'candidate',
		states: 'Native Hover、Focus、Delay、Escape；Current 真实应用边界',
		verification: 'Native 可在隔离 Lab 验证；Current 必须在真实 Task Row、Shell 与 Tauri 窗口验收',
		preservedContract:
			'键盘打开、焦点目标切换、延迟关闭、预览内指针驻留、Drawer 抑制、外部点击、查询状态、固定 Shell 位置；Store 的 pointer-open 能力当前未接入生产调用方。',
		expectedDeletion:
			'无。HoverCard 的 trigger-local Overlay 不能替代 TaskPreview Store、跨行 source、查询与 Shell 固定定位。',
		recipeFamilies: [
			'Recipe · Keep · .card:not(.card--transparent) · TaskPreview 与其他 Card 消费者',
			'Upstream · Keep · HoverCard 无 StoneFlow selector · 当前无直接生产消费者',
		],
	},
	{
		id: 'heroui-candidate-inline-select-metadata',
		name: 'InlineSelect → Metadata',
		view: 'heroui',
		category: '替换候选',
		description:
			'用同一组优先级选项对照生产 MetadataFieldDropdown 与原生 InlineSelect，不把候选当成迁移批准。',
		keywords: ['inline select', 'metadata', 'priority', 'shortcut', 'drawer overlay'],
		owner: 'Product',
		recommendedOwner: 'Product',
		source:
			'@heroui-pro/react@1.0.0-beta.8；src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		coverage: 'rendered',
		comparisonFixture: 'candidate-inline-select',
		Preview: InlineSelectCurrentPreview,
		inventoryRefs: [
			'heroui-pro-inline-select',
			'stoneflow-component-metadata-field-dropdown',
			'stoneflow-component-metadata-field-button',
			'stoneflow-component-metadata-field-menu-item',
		],
		disposition: 'keep',
		adoption: 'candidate',
		states: 'Selected、Open、Keyboard Navigation、Focus-visible、Compact',
		verification:
			'Lab 对照视觉与公开交互；数字快捷键、自定义日期、Drawer Portal 和 Autosave 仅产品验收',
		preservedContract:
			'28px 紧凑入口、图标/长文本、Tooltip 与禁用原因、数字快捷键、多值指示、自定义日期分支、Drawer-owned Overlay、焦点返回。',
		expectedDeletion:
			'无。InlineSelect 只覆盖简单单选，不能删除共享 MetadataFieldButton、Dropdown、MenuItem 或快捷键分支。',
		recipeFamilies: [
			'Recipe · Keep · .button · MetadataFieldButton 与其他 Button 消费者',
			'Recipe · Keep · .menu-item · MetadataFieldMenuItem 与其他 Menu 消费者',
			'Recipe · Keep · .dropdown__popover · Metadata 与其他 Dropdown 消费者',
			'Upstream · Keep · InlineSelect 无 StoneFlow selector · 当前无直接生产消费者',
		],
	},
	{
		id: 'heroui-candidate-combobox-property-menu',
		name: 'ComboBox / Autocomplete → 可搜索属性菜单',
		view: 'heroui',
		category: '替换候选',
		description:
			'复用第九批原生 fixture，对照生产 PageFilterButton/FilterMenu；候选不拥有 FilterQuery 或二级值业务。',
		keywords: ['combobox', 'autocomplete', 'filter menu', 'searchable property', 'submenu'],
		owner: 'Product',
		recommendedOwner: 'Product',
		source:
			'@heroui/react@3.2.4；src/features/filter/components/PageFilterButton.tsx；src/features/filter/components/FilterMenu.tsx；src/features/filter/components/FilterValueSubMenu.tsx',
		coverage: 'rendered',
		comparisonFixture: 'oss-combobox-autocomplete',
		Preview: SearchablePropertyMenuCurrentPreview,
		inventoryRefs: [
			'heroui-oss-combo-box',
			'heroui-oss-autocomplete',
			'stoneflow-component-page-filter-button',
			'stoneflow-component-filter-menu',
			'stoneflow-component-filter-value-sub-menu',
		],
		disposition: 'keep',
		adoption: 'candidate',
		states: 'Search、Empty、Keyboard Navigation、Submenu、Multiple Values、Escape、Focus Return',
		verification: 'Lab 使用本地 FilterQuery；真实 URL/View session、项目数据与命令入口仅产品验收',
		preservedContract:
			'字段搜索、二级值菜单、多选勾选、即时写回、菜单保持打开、空结果、Escape 焦点返回、命令快捷键。',
		expectedDeletion:
			'无。ComboBox/Autocomplete 的单值输入语义不能替代字段子菜单、多选值菜单与即时 FilterQuery 写回。',
		recipeFamilies: [
			'Recipe · Keep · .search-field__group · FilterMenu / FilterValueSubMenu',
			'Recipe · Keep · .menu-item · FilterMenu / FilterValueSubMenu',
			'Recipe · Keep · .dropdown__popover · FilterMenu / FilterValueSubMenu',
			'Upstream · Keep · ComboBox / Autocomplete 无 StoneFlow selector · 当前无直接生产消费者',
		],
	},
	{
		id: 'heroui-candidate-tag-group-labels',
		name: 'TagGroup → Labels',
		view: 'heroui',
		category: '替换候选',
		description:
			'对照原生 TagGroup 与既有 Labels Lab 假设；当前没有生产标签领域模型、持久化合同或消费者。',
		keywords: ['tag group', 'labels', 'lab only', 'no production consumer'],
		owner: 'Upstream',
		recommendedOwner: 'Upstream',
		source: '@heroui/react@3.2.4；src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		comparisonFixture: 'candidate-tag-group',
		Preview: TagGroupCurrentPreview,
		inventoryRefs: ['heroui-oss-tag-group'],
		disposition: 'keep',
		adoption: 'no-current-scenario',
		states: 'Native Selection、Keyboard Navigation；Labels Lab Search、Open/Close、Empty',
		verification: '只验证 Lab 产品假设与上游 API；不宣称生产覆盖，不写持久化',
		preservedContract:
			'若未来引入标签：28px 标签、已选常驻、已选项置顶、搜索、Checkbox 点击保持菜单、Item 点击关闭、Kbd 与稳定锚点。',
		expectedDeletion: '无。当前没有生产消费者，也没有生产标签代码或候选专属 CSS 可以删除。',
		recipeFamilies: ['Upstream · Keep · TagGroup / Tag 无 StoneFlow selector · 当前无生产消费者'],
	},
	{
		id: 'heroui-candidate-segment-view-switch',
		name: 'Segment → 简单单选视图切换',
		view: 'heroui',
		category: '替换候选',
		description:
			'用相同两项单选数据对照生产 PageFrame Toolbar choices 与原生 Segment；多选筛选不在候选范围。',
		keywords: ['segment', 'page frame', 'single selection', 'view switch', 'toggle button group'],
		owner: 'Product',
		recommendedOwner: 'Product',
		source: '@heroui-pro/react@1.0.0-beta.8；src/shared/components/page-frame/PageFrame.tsx',
		coverage: 'rendered',
		comparisonFixture: 'candidate-segment',
		Preview: SegmentCurrentPreview,
		inventoryRefs: ['heroui-pro-segment', 'stoneflow-component-page-frame-toolbar-choices'],
		disposition: 'keep',
		adoption: 'candidate',
		states: 'Single Selected、Hover、Keyboard Navigation、Focus-visible、Narrow、Async Pending',
		verification: 'Lab 对照公开交互；真实 Router、异步失败回滚和窄窗口布局仅产品验收',
		preservedContract:
			'28px Ghost、单选不可清空、受控值、异步乐观选择与回滚、窄宽换行、Toolbar 组合、Focus-visible。',
		expectedDeletion:
			'无。Segment 只减少少量 Set↔single key 适配，PageFrame 的乐观选择、回滚、换行与 Toolbar 合同仍须保留。',
		recipeFamilies: [
			'Recipe · Keep · .toggle-button · PageFrame、Update、ViewEditor 等消费者',
			'Upstream · Keep · Segment 无 StoneFlow selector · 当前无直接生产消费者',
		],
	},
] satisfies readonly UiLabReviewUnitInput[]
