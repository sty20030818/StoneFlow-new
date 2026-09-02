import { useState, type ReactNode } from 'react'

import {
	RouterContextProvider,
	createMemoryHistory,
	createRootRoute,
	createRouter,
} from '@tanstack/react-router'
import { Button, Kbd } from '@heroui/react'
import { FolderIcon, MoreHorizontalIcon, PlusIcon } from 'lucide-react'

import { SpaceEditorDialog } from '@/features/space'
import { TaskPageState } from '@/features/task'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { BoardRowSlot, type BoardRowSelectionPosition } from '@/shared/components/board'
import { PageFrame } from '@/shared/components/page-frame'
import { RowLayout, RowShell } from '@/shared/components/row'
import { ActionTooltip, DisabledActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'

const PRODUCT_OWNERSHIP = {
	view: 'stoneflow',
	owner: 'Product',
	recommendedOwner: 'Product',
	disposition: 'keep',
} as const

const productRouter = createRouter({
	routeTree: createRootRoute(),
	history: createMemoryHistory({ initialEntries: ['/space-demo/projects/project-demo'] }),
	defaultNotFoundComponent: () => null,
})

function Fixture({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className='flex w-full min-w-0 max-w-5xl flex-col gap-4'>
			<h3 className='text-base font-semibold'>{title}</h3>
			{children}
			<p className='text-xs leading-5 text-muted'>
				这里直接渲染生产公开组件；Lab 只提供无副作用数据和最小运行环境。
			</p>
		</div>
	)
}

export function PageFrameFixture() {
	const [selectedKey, setSelectedKey] = useState('all')
	const items = Array.from({ length: 8 }, (_, index) => `第 ${index + 1} 条长内容`)

	return (
		<Fixture title='PageFrame'>
			<RouterContextProvider router={productRouter}>
				<div className='grid gap-4 lg:grid-cols-2'>
					<section
						aria-label='PageFrame Body 样本'
						className='h-80 min-w-0 overflow-hidden rounded-lg border border-surface'
					>
						<PageFrame.Root>
							<PageFrame.Header
								actions={
									<Button size='sm' type='button'>
										<PlusIcon aria-hidden className='size-4' />
										新建
									</Button>
								}
								breadcrumb={
									<AppBreadcrumb
										items={[
											{ key: 'projects', label: '项目', to: '/space-demo/projects' },
											{
												key: 'current',
												label: '这是一个用于观察窄宽截断的长中文项目名称',
												current: true,
											},
										]}
									/>
								}
							/>
							<PageFrame.Toolbar
								displayAction={
									<Button size='sm' type='button' variant='ghost'>
										显示
									</Button>
								}
								filterAction={
									<Button size='sm' type='button' variant='ghost'>
										筛选
									</Button>
								}
								filterBar={<p className='text-xs text-muted'>状态 = 待执行</p>}
								onSelectionChange={setSelectedKey}
								pills={[
									{ key: 'all', label: '全部' },
									{ key: 'mine', label: '我的任务' },
								]}
								selectedKey={selectedKey}
							/>
							<PageFrame.Body>
								<div className='space-y-2'>
									{items.map((item) => (
										<p className='rounded-md bg-surface-secondary p-2 text-sm' key={item}>
											{item}
										</p>
									))}
								</div>
							</PageFrame.Body>
						</PageFrame.Root>
					</section>

					<section
						aria-label='PageFrame CollectionBody 样本'
						className='h-80 min-w-0 overflow-hidden rounded-lg border border-surface'
					>
						<PageFrame.Root>
							<PageFrame.Header title='CollectionBody' />
							<PageFrame.CollectionBody>
								<p className='sticky top-0 z-10 bg-background py-2 text-sm font-medium'>
									固定分组标题
								</p>
								{items.map((item) => (
									<p className='border-b border-separator py-3 text-sm' key={item}>
										{item} · CollectionBody 只提供真实 viewport
									</p>
								))}
							</PageFrame.CollectionBody>
						</PageFrame.Root>
					</section>
				</div>
			</RouterContextProvider>
		</Fixture>
	)
}

function TooltipFamilyFixture() {
	return (
		<Fixture title='Tooltip family'>
			<div className='flex flex-wrap items-center gap-3'>
				<ActionTooltip
					closeDelay={0}
					delay={0}
					label='新建任务'
					shortcut={
						<Kbd variant='light'>
							<Kbd.Content>N</Kbd.Content>
						</Kbd>
					}
				>
					<Button type='button' variant='secondary'>
						新建任务
					</Button>
				</ActionTooltip>

				<DisabledActionTooltip
					label='归档任务'
					reason={null}
					shortcut={
						<Kbd variant='light'>
							<Kbd.Content>A</Kbd.Content>
						</Kbd>
					}
				>
					<Button isDisabled type='button' variant='secondary'>
						归档任务
					</Button>
				</DisabledActionTooltip>

				<div className='w-40'>
					<OverflowTooltip content='这是一个只在真实溢出时出现说明的很长很长的中文项目名称'>
						这是一个只在真实溢出时出现说明的很长很长的中文项目名称
					</OverflowTooltip>
				</div>
			</div>
		</Fixture>
	)
}

function AppBreadcrumbFixture() {
	return (
		<Fixture title='AppBreadcrumb'>
			<RouterContextProvider router={productRouter}>
				<div className='w-full max-w-lg overflow-hidden rounded-lg border border-surface p-3'>
					<AppBreadcrumb
						items={[
							{ key: 'workspace', label: '工作区', to: '/space-demo' },
							{
								key: 'project',
								label: '这是一个用于验证中间祖先截断的长中文项目名称',
								to: '/space-demo/projects/project-demo',
								icon: FolderIcon,
							},
							{ key: 'task', label: '当前任务', current: true },
						]}
					/>
				</div>
			</RouterContextProvider>
			<p className='text-sm text-muted'>祖先保持 Link 语义；当前项由真实组件输出 aria-current。</p>
		</Fixture>
	)
}

function RowShellFixture() {
	const rows: ReadonlyArray<{
		id: string
		label: string
		active?: boolean
		selected?: boolean
		hovered?: boolean
		hoverSource?: 'keyboard'
		selectionPosition?: BoardRowSelectionPosition
		pending?: boolean
	}> = [
		{ id: 'active', label: 'Active 行', active: true },
		{
			id: 'first',
			label: '连续选择 · 第一行',
			selected: true,
			hovered: true,
			hoverSource: 'keyboard' as const,
			selectionPosition: 'first',
		},
		{
			id: 'middle',
			label: '连续选择 · 中间行',
			selected: true,
			selectionPosition: 'middle',
		},
		{
			id: 'last',
			label: '连续选择 · 最后一行',
			selected: true,
			selectionPosition: 'last',
		},
		{ id: 'pending', label: 'Pending 行', pending: true },
	] as const

	return (
		<Fixture title='RowShell'>
			<div className='max-w-2xl overflow-hidden rounded-lg border border-surface'>
				{rows.map((row) => (
					<BoardRowSlot key={row.id} selectionPosition={row.selectionPosition}>
						<RowShell
							active={row.active}
							hovered={row.hovered}
							hoverSource={row.hoverSource}
							pending={row.pending}
							selected={row.selected}
						>
							<RowLayout
								actions={
									<Button aria-label={`${row.label} 更多操作`} isIconOnly size='sm' variant='ghost'>
										<MoreHorizontalIcon aria-hidden className='size-4' />
									</Button>
								}
								primary={<span className='block truncate'>{row.label}</span>}
							/>
						</RowShell>
					</BoardRowSlot>
				))}
			</div>
			<p className='text-sm text-muted'>
				状态由真实 RowShell data contract 渲染，不复制集合键盘状态机。
			</p>
		</Fixture>
	)
}

function AppScrollAreaFixture() {
	return (
		<Fixture title='AppScrollArea'>
			<div className='h-64 max-w-2xl overflow-hidden rounded-lg border border-separator bg-surface-secondary p-2'>
				<AppScrollArea>
					<div className='sticky top-0 z-10 border-b border-separator bg-surface px-3 py-2 text-sm font-medium shadow-sm'>
						固定标题
					</div>
					{Array.from({ length: 12 }, (_, index) => (
						<p className='border-b border-separator bg-surface px-3 py-3 text-sm' key={index}>
							第 {index + 1} 条用于验证真实 viewport、长内容与滚动边界
						</p>
					))}
				</AppScrollArea>
			</div>
		</Fixture>
	)
}

export function TaskDetailPublicFixture() {
	const [actionCount, setActionCount] = useState(0)

	return (
		<Fixture title='Task Detail 公共组件'>
			<div className='h-72 w-full overflow-hidden rounded-lg border border-surface'>
				<TaskPageState
					actionLabel='返回任务列表'
					description='这个任务不存在，或者当前已经不可见。'
					onAction={() => setActionCount((count) => count + 1)}
					title='任务不存在'
				/>
			</div>
			<p aria-live='polite' className='text-sm text-muted'>
				已触发恢复动作 {actionCount} 次；完整 TaskDetailContent 仍由真实 ViewModel 组合覆盖。
			</p>
		</Fixture>
	)
}

export function SpaceEditorFixture() {
	const [open, setOpen] = useState(false)
	const [lastSpace, setLastSpace] = useState('尚未提交 Space')

	return (
		<Fixture title='Space Editor 组件'>
			<Button onPress={() => setOpen(true)} type='button'>
				打开 Space Editor
			</Button>
			<SpaceEditorDialog
				mode='create'
				onClose={() => setOpen(false)}
				onSubmit={async (input) => setLastSpace(`已提交：${input.name}`)}
				open={open}
			/>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastSpace}；Lab 不写入数据库。
			</p>
		</Fixture>
	)
}

export const TICKET_11_SAMPLES = [
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-page-frame-review',
		name: 'PageFrame · 共享产品合同',
		category: 'Navigation',
		description: '使用真实 Root、Header、Toolbar、Body 与 CollectionBody 核对页面框架合同。',
		keywords: ['page frame', 'header', 'toolbar', 'body', 'collection'],
		source: 'src/shared/components/page-frame/PageFrame.tsx',
		coverage: 'rendered',
		Preview: PageFrameFixture,
		states: '标题、Breadcrumb、Actions、Filter、长中文、窄宽、真实滚动 viewport',
		verification: '浏览器 Lab；虚拟化性能与真实页面数据留给产品场景',
		inventoryRefs: ['page-frame-scene'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-tooltip-family-review',
		name: 'Tooltip family',
		category: 'Overlays',
		description: '直接核对 ActionTooltip、DisabledActionTooltip 与 OverflowTooltip 的产品合同。',
		keywords: ['tooltip', 'disabled reason', 'overflow', 'shortcut'],
		source: 'src/shared/components/tooltip',
		coverage: 'rendered',
		Preview: TooltipFamilyFixture,
		states: 'Pointer、Keyboard Focus、Shortcut、Disabled、真实溢出',
		verification: '浏览器 Lab；不复制 Trigger props/ref 合并逻辑',
		inventoryRefs: [
			'stoneflow-component-action-tooltip',
			'stoneflow-component-disabled-action-tooltip',
			'stoneflow-component-overflow-tooltip',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-app-breadcrumb-review',
		name: 'AppBreadcrumb · 共享产品合同',
		category: 'Navigation',
		description: '使用最小 Memory Router 核对祖先、当前项、图标、截断与 aria-current。',
		keywords: ['breadcrumb', 'router', 'aria-current', 'truncate'],
		source: 'src/shared/components/AppBreadcrumb.tsx',
		coverage: 'rendered',
		Preview: AppBreadcrumbFixture,
		states: 'Ancestor Link、Current、Long Label、Focus-visible、Narrow Width',
		verification: '最小 Memory Router；真实导航历史留给 Shell',
		inventoryRefs: ['stoneflow-breadcrumb'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-shell-sidebar-review',
		name: 'ShellSidebar / SidebarNavRow',
		category: 'Navigation',
		description: '登记 ShellSidebar 与 SidebarNavRow 的真实产品合同，不复制 Shell 运行时。',
		keywords: ['shell sidebar', 'sidebar nav row', 'desktop', 'router'],
		source: 'src/layout/ShellSidebar.tsx；src/layout/sidebar/SidebarNavRow.tsx',
		coverage: 'real-app-only',
		reason:
			'ShellSidebar 依赖真实 Router、Space 数据、命令与桌面窗口；UI Lab 边界禁止深导入 layout 并复制第二套 Sidebar。第三、八批已有视觉组合，真实折叠与焦点路径在应用验收。',
		states: 'Density、Hover、Current、Disabled、长项目名、窗口折叠、Focus Return',
		verification: '仅真实 Tauri Main；Lab 展示总账与既有组合覆盖关系',
		inventoryRefs: ['stoneflow-shell-sidebar-scene', 'stoneflow-component-sidebar-nav-row'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-row-shell-review',
		name: 'RowShell · 共享产品合同',
		category: 'Collections',
		description: '直接核对 RowShell 的密度、状态外壳、连续选择位置和尾部动作边界。',
		keywords: ['row shell', 'selection group', 'hover source', 'pending'],
		source: 'src/shared/components/row/RowShell.tsx',
		coverage: 'rendered',
		Preview: RowShellFixture,
		states: 'Active、Selected、Keyboard Hover、Pending、First/Middle/Last、Trailing Action',
		verification: '静态公共 props；方向键、范围选择与 pointer 状态机留给集合消费者',
		inventoryRefs: ['stoneflow-row-shell'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-app-scroll-area-review',
		name: 'AppScrollArea',
		category: 'Collections',
		description: '直接核对唯一真实滚动 viewport、sticky 标题和长内容边界。',
		keywords: ['scroll area', 'viewport', 'sticky', 'virtualizer'],
		source: 'src/shared/components/AppScrollArea.tsx',
		coverage: 'rendered',
		Preview: AppScrollAreaFixture,
		states: 'Scrollable、Sticky、Long Content、Narrow Width',
		verification: '浏览器真实滚动；不搭建第二套 virtualizer',
		inventoryRefs: ['stoneflow-component-app-scroll-area'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-settings-toggle-row-review',
		name: 'SettingsToggleRow',
		category: 'Fields',
		description:
			'登记私有 SettingsToggleRow 的产品合同，由 CellSwitch 原料和后续 Settings 场景覆盖。',
		keywords: ['settings toggle row', 'cell switch', 'settings'],
		source: 'src/features/settings/components/settingsShared.tsx',
		coverage: 'covered-in-composition',
		reason:
			'SettingsToggleRow 没有从 @/features/settings 公共面导出；为 Lab 新增导出或复制 JSX 都会扩大生产 API。第十批已覆盖 CellSwitch，完整设置组合留给后续场景。',
		states: 'Selected、Disabled、Label、Description',
		verification: '第十批 CellSwitch + Settings 产品组合；不为 Lab 扩生产 public API',
		inventoryRefs: ['stoneflow-component-settings-toggle-row'],
		ingredients: ['heroui-pro-cell-switch'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-global-search-results-review',
		name: 'GlobalSearchResults',
		category: 'Collections',
		description: '登记私有 GlobalSearchResults 的产品合同，不伪造 Query、Router 或 Tauri 搜索。',
		keywords: ['global search results', 'list view', 'query', 'search'],
		source: 'src/features/global-search/components/GlobalSearchResults.tsx',
		coverage: 'covered-in-composition',
		reason:
			'GlobalSearchResults 是 feature 私有组件；真实结果、键盘高亮、Router 与 Tauri 查询在搜索组合中共同变化，不应复制为 Lab 状态机。',
		states: 'Loading、Empty、Error、Keyboard Highlight、Task/Project Results',
		verification: '第十批 ListView + 后续真实搜索组合；不在 Lab 伪造数据管线',
		inventoryRefs: ['stoneflow-component-global-search-results'],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-task-detail-public-review',
		name: 'Task Detail 公共组件',
		category: 'Product Scenes',
		description: '直接渲染轻量 TaskPageState，并登记完整 TaskDetailContent 的真实组合边界。',
		keywords: ['task page state', 'task detail content', 'empty state', 'autosave'],
		source:
			'src/features/task/detail/components/TaskPageState.tsx；src/features/task/detail/components/TaskDetailContent.tsx',
		coverage: 'rendered',
		Preview: TaskDetailPublicFixture,
		states: 'Empty、Error、Recovery Action；完整详情为组合覆盖',
		verification:
			'TaskPageState 无副作用；Autosave、Query、Submit Registry 与详情 ViewModel 为 real-app-only',
		inventoryRefs: [
			'stoneflow-component-task-page-state',
			'stoneflow-component-task-detail-content',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-shared-space-editor-review',
		name: 'Space Editor 组件',
		category: 'Product Scenes',
		description: '通过公开 feature 入口渲染真实 SpaceEditorDialog，提交只更新 Lab 状态。',
		keywords: ['space editor', 'modal', 'color swatch', 'form'],
		source: 'src/features/space/components/SpaceEditorDialog.tsx',
		coverage: 'rendered',
		Preview: SpaceEditorFixture,
		states: 'Closed、Open、Validation、Submit、Close、Focus Return',
		verification: '本地受控 open/onSubmit；不写数据库、不调用 Tauri',
		inventoryRefs: ['stoneflow-component-space-editor-dialog'],
	},
] satisfies readonly UiLabReviewUnitInput[]
