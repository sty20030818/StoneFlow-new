import { useMemo, useState } from 'react'

import { Button } from '@heroui/react'

import { BulkActionBar } from '@/features/bulk-action'
import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	KeybindingRegistry,
	ShortcutRegistryProvider,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
} from '@/features/command'
import {
	getTaskPriorityMetadataDropdownProps,
	MetadataFieldDropdown,
	MetadataFieldValue,
} from '@/features/metadata-fields'
import type { TaskPriorityValue } from '@/features/task'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'
import {
	GroupHeaderPreview,
	LabelsPreview,
	TaskBoardPreview,
	TaskRowPreview,
} from '../ticket-05/collectionsAndTaskSamples'

const PRODUCT_OWNERSHIP = {
	view: 'stoneflow',
	owner: 'Product',
	recommendedOwner: 'Product',
	disposition: 'keep',
} as const

const SHORTCUT_REGISTRY = new KeybindingRegistry([])

function command(id: Command['id'], title: string, run: Command['run']): Command {
	return { id, title, category: 'general', scope: ['global'], run }
}

function BulkActionBarFixture() {
	const [selectedIds, setSelectedIds] = useState(['project-a', 'project-b', 'project-c'])
	const [status, setStatus] = useState('尚未执行批量动作')
	const runtime = useMemo(
		() =>
			new CommandRuntime({
				registry: new CommandRegistry([
					command(COMMAND_IDS.projectArchive, '归档项目', () => {
						setStatus('已触发本地归档动作')
					}),
					command(COMMAND_IDS.projectDelete, '删除项目', () => {
						setStatus('已触发本地删除动作')
					}),
				]),
				getContext: createEmptyCommandContext,
			}),
		[],
	)
	const context = useMemo<CommandContext>(() => {
		const base = createEmptyCommandContext()
		return {
			...base,
			selection: {
				type: 'project',
				ids: selectedIds,
				entities: selectedIds.map((id) => ({ id, type: 'project', title: id })),
				primaryEntity: selectedIds[0]
					? { id: selectedIds[0], type: 'project', title: selectedIds[0] }
					: undefined,
				clearSelection: () => {
					setSelectedIds([])
					setStatus('已清空本地选择')
				},
				source: 'project-list',
				hasSelection: selectedIds.length > 0,
				isSingleSelection: selectedIds.length === 1,
				isMultiSelection: selectedIds.length > 1,
			},
		}
	}, [selectedIds])

	return (
		<div className='flex min-h-56 w-full max-w-3xl flex-col gap-4'>
			<div>
				<h3 className='text-base font-semibold'>Bulk ActionBar</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					直接渲染生产 BulkActionBar；选择和 Command Runtime 仅保存在这个 fixture 内。
				</p>
			</div>
			<Button
				className='self-start'
				onPress={() => {
					setSelectedIds(['project-a', 'project-b', 'project-c'])
					setStatus('已恢复 3 项本地选择')
				}}
				size='sm'
				variant='secondary'
			>
				恢复 3 项选择
			</Button>
			<p aria-live='polite' className='text-sm text-muted'>
				{status}
			</p>
			<ShortcutRegistryProvider registry={SHORTCUT_REGISTRY}>
				<BulkActionBar context={context} runtime={runtime} />
			</ShortcutRegistryProvider>
		</div>
	)
}

export function TaskMetadataReviewFixture() {
	const [priority, setPriority] = useState<TaskPriorityValue>(2)
	const priorityDropdown = getTaskPriorityMetadataDropdownProps()

	return (
		<div className='flex w-full max-w-2xl flex-col gap-4'>
			<div className='flex flex-wrap items-end gap-4'>
				<div className='flex flex-col gap-1'>
					<span className='text-xs text-muted'>可编辑优先级</span>
					<MetadataFieldDropdown
						compact
						fieldKey='priority'
						label='优先级'
						menuLabel={priorityDropdown.menuLabel}
						onChange={setPriority}
						options={priorityDropdown.options}
						value={priority}
					/>
				</div>
				<div className='flex flex-col gap-1'>
					<span className='text-xs text-muted'>空值（只读）</span>
					<MetadataFieldValue ariaLabel='空元数据值' label='—' />
				</div>
				<div className='flex flex-col gap-1'>
					<span className='text-xs text-muted'>长文本（只读）</span>
					<MetadataFieldValue
						ariaLabel='长元数据值'
						label='这是一个很长很长的项目名称，用于验证截断与提示'
					/>
				</div>
			</div>
			<p aria-live='polite' className='text-sm text-muted'>
				当前优先级：{priorityDropdown.options.find((option) => option.value === priority)?.label}
			</p>
		</div>
	)
}

export const TICKET_12_SAMPLES = [
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-task-board-review',
		name: 'TaskBoard · 产品合同',
		category: 'Product Scenes',
		description:
			'复用第五批已确认的宽窄 TaskBoard fixture；真实虚拟化、sticky 与集合状态继续由生产路径拥有。',
		keywords: ['task board', '44px row', '36px header', '2px gap', 'virtualized'],
		source:
			'src/features/task/components/TaskBoard.tsx；src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		Preview: TaskBoardPreview,
		states: '44px Row、36px Header、2px Gap、Wide、Narrow、Selected、Long Text',
		verification: '复用第五批浏览器视觉；虚拟化、sticky、Query 与命令运行时仅真实应用',
		inventoryRefs: ['stoneflow-scene-task-board', 'stoneflow-task-board'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-group-header-review',
		name: 'Group Header · 产品合同',
		category: 'Collections',
		description: '复用第五批 Group Header fixture，核对折叠、计数、创建动作与长中文。',
		keywords: ['group header', 'collapse', 'count', 'create', 'long text'],
		source:
			'src/features/task/components/TaskBoard.tsx；src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		Preview: GroupHeaderPreview,
		states: 'Expanded、Collapsed、Count、Create Action、Long Text',
		verification: '复用第五批浏览器交互；sticky、右键菜单与真实分组模型仅真实应用',
		inventoryRefs: ['stoneflow-scene-task-board', 'stoneflow-task-board'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-task-row-review',
		name: 'Task Row · 产品合同',
		category: 'Collections',
		description: '复用第五批 Task Row fixture，核对行密度、状态、元数据和尾部动作。',
		keywords: ['task row', 'row shell', 'metadata', 'trailing action'],
		source:
			'src/features/task/components/TaskRowAdapter.tsx；src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		Preview: TaskRowPreview,
		states: 'Rest、Hover、Selected、Metadata、Trailing Action',
		verification: '复用第五批浏览器视觉；真实 TaskRowAdapter 命令、Store 与写入仅真实应用',
		inventoryRefs: ['stoneflow-component-task-row-adapter', 'stoneflow-row-shell'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-contiguous-selection-review',
		name: '连续选择',
		category: 'Collections',
		description: '复用同一 Task Row fixture 检查 single、first、middle、last 与 selected-hover。',
		keywords: ['selection', 'single', 'first', 'middle', 'last', 'selected hover'],
		source: 'src/features/task/components/TaskBoard.tsx；src/shared/components/row/RowShell.tsx',
		coverage: 'rendered',
		Preview: TaskRowPreview,
		states: 'Single、First、Middle、Last、Selected、Selected Hover',
		verification: '浏览器核对形状；范围选择、方向键和 SelectionManager 只由生产集合验证',
		inventoryRefs: [
			'stoneflow-scene-task-board',
			'stoneflow-component-task-row-adapter',
			'stoneflow-row-shell',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-bulk-action-review',
		name: 'Bulk ActionBar · 产品合同',
		category: 'Product Scenes',
		description: '直接渲染生产 BulkActionBar，用本地 CommandContext 验证数量、动作层级与清空选择。',
		keywords: ['bulk action', 'action bar', 'selection', 'command runtime'],
		source: 'src/features/bulk-action/components/BulkActionBar.tsx',
		coverage: 'rendered',
		Preview: BulkActionBarFixture,
		states: '3 Selected、Command Action、Clear Selection、Restore Selection',
		verification: '本地可逆状态；不执行生产命令、不写 Store',
		inventoryRefs: ['stoneflow-scene-task-board', 'stoneflow-component-bulk-action-bar'],
	},
	{
		...PRODUCT_OWNERSHIP,
		owner: 'UI Lab fixture / HeroUI OSS',
		recommendedOwner: 'Product',
		disposition: 'candidate',
		id: 'stoneflow-task-collection-labels-review',
		name: 'Labels · 产品假设',
		category: 'Collections',
		description: '复用第五批已确认的 Labels 假设；当前仍没有生产标签领域模型或持久化合同。',
		keywords: ['labels', 'chip', 'dropdown', 'checkbox', 'product assumption'],
		source: 'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		Preview: LabelsPreview,
		states: 'Selected Labels、Search、Selected Group、Available Group、Empty Result',
		verification: '仅 Lab 产品假设；不宣称生产采用，不写持久化',
		ingredients: [
			'heroui-oss-chip',
			'heroui-oss-dropdown',
			'heroui-oss-checkbox',
			'heroui-search-field-candidate',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-global-search-review',
		name: 'Global Search · 结果合同',
		category: 'Product Scenes',
		description: '链接第五批 ListView 结果合同与第十一批真实组件边界，不自造搜索代理视觉。',
		keywords: ['global search', 'list view', 'subtitle', 'time', 'empty'],
		source:
			'src/features/global-search/components/GlobalSearchResults.tsx；src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'covered-in-composition',
		reason:
			'GlobalSearchResults 是 feature 私有展示面；第五批已覆盖通用 ListView，第十一批已登记真实组件边界。为避免扩大生产 API，本批只链接既有证据。',
		states: 'ListView 结果状态由第五批覆盖；真实 Empty、Narrow 与键盘高亮由产品场景验证',
		verification: '既有 fixture + 真实应用；Query、Router 与 Tauri 搜索不在浏览器 Lab 代签',
		inventoryRefs: ['stoneflow-scene-global-search', 'stoneflow-component-global-search-results'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-metadata-review',
		name: 'Task Metadata · 产品合同',
		category: 'Product Scenes',
		description:
			'直接渲染生产公开 MetadataFieldDropdown 与 MetadataFieldValue，明确区分可编辑入口和只读样例。',
		keywords: ['task metadata', 'compact', '28px', 'empty', 'long text'],
		source:
			'src/features/metadata-fields/components/MetadataFieldDropdown.tsx；src/features/metadata-fields/components/MetadataFieldValue.tsx',
		coverage: 'rendered',
		Preview: TaskMetadataReviewFixture,
		states: 'Default、Empty Value、Long Text、Compact Trigger、Focus-visible',
		verification: '浏览器验证公开组件与本地优先级状态；Autosave 和业务写入仅真实应用',
		inventoryRefs: [
			'stoneflow-scene-task-detail',
			'stoneflow-component-task-properties-section',
			'stoneflow-component-metadata-field-dropdown',
			'stoneflow-component-metadata-field-value',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-task-collection-activity-review',
		name: 'Activity / Timeline · 产品合同',
		category: 'Product Scenes',
		description: '链接第十批 Timeline 原料与第十一批真实任务活动边界，不自造产品代理状态。',
		keywords: ['activity', 'timeline', 'loading', 'empty', 'error', 'long text'],
		source:
			'src/features/task/detail/components/TaskActivityTimeline.tsx；src/ui-lab/samples/ticket-10/heroUiComplexControlsSamples.tsx',
		coverage: 'covered-in-composition',
		reason:
			'TaskActivityTimeline 是任务详情私有展示面，结构与数据状态由产品组合拥有；第十批只覆盖上游 Timeline 原料，本批不复制第二套活动状态机。',
		states: '上游 Timeline 由第十批覆盖；产品 Loading、Empty、Error、Long Text 由真实任务详情验证',
		verification: '既有 fixture + 真实应用；Query、项目映射与 Activity 数据不在浏览器 Lab 代签',
		inventoryRefs: ['stoneflow-scene-task-detail', 'stoneflow-component-task-activity-timeline'],
	},
] satisfies readonly UiLabReviewUnitInput[]
