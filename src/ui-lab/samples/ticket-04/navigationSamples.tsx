import { useState, type CSSProperties } from 'react'

import {
	RouterContextProvider,
	createMemoryHistory,
	createRootRoute,
	createRouter,
} from '@tanstack/react-router'
import { Button, Kbd, Pagination, Tabs } from '@heroui/react'
import { Command, Sidebar } from '@heroui-pro/react'
import {
	ArchiveIcon,
	FolderIcon,
	InboxIcon,
	LayoutGridIcon,
	ListTodoIcon,
	SearchIcon,
	Settings2Icon,
} from 'lucide-react'

import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'

import type { UiLabSample } from '../../uiLabCatalog'

const breadcrumbRouter = createRouter({
	routeTree: createRootRoute(),
	history: createMemoryHistory({ initialEntries: ['/space-demo/projects/project-demo'] }),
	defaultNotFoundComponent: () => null,
})

function BreadcrumbPreview() {
	return (
		<div className='flex w-full max-w-3xl flex-col gap-5'>
			<div className='rounded-lg border border-surface bg-background p-4'>
				<RouterContextProvider router={breadcrumbRouter}>
					<AppBreadcrumb
						items={[
							{
								key: 'projects',
								label: '项目总览',
								to: '/space-demo/projects',
								icon: LayoutGridIcon,
							},
							{
								key: 'project',
								label: '这是一个用于观察长中文截断与层级关系的项目名称',
								current: true,
							},
						]}
					/>
				</RouterContextProvider>
			</div>
			<dl className='grid gap-3 text-sm sm:grid-cols-2'>
				<div>
					<dt className='font-medium'>可导航祖先</dt>
					<dd className='mt-1 text-muted'>真实链接，可进入 Tab 次序并保留浏览器导航语义。</dd>
				</div>
				<div>
					<dt className='font-medium'>当前位置</dt>
					<dd className='mt-1 text-muted'>带 aria-current="page"，不可再次激活。</dd>
				</div>
			</dl>
			<p className='text-xs leading-5 text-muted'>
				操作提示：用 Tab 聚焦祖先链接；键盘焦点应与 Link 样本一致。指针 Hover 只出现中性 Ghost
				背景，不出现蓝色或下划线；当前项不伪装成可点击。
			</p>
		</div>
	)
}

const SIDEBAR_ITEMS = [
	{ id: 'inbox', label: '收件箱', icon: InboxIcon },
	{ id: 'tasks', label: '所有任务', icon: ListTodoIcon },
	{
		id: 'project',
		label: '这是一个很长很长的中文项目名称，用于观察溢出',
		icon: FolderIcon,
	},
	{ id: 'archive', label: '归档（不可用）', icon: ArchiveIcon, isDisabled: true },
] as const

function SidebarFixture({
	ariaLabel,
	idPrefix,
	onSelect,
	selectedId,
}: {
	ariaLabel: string
	idPrefix: string
	onSelect: (id: string) => void
	selectedId: string
}) {
	return (
		<Sidebar.Provider
			className='h-full min-h-0'
			collapsible='none'
			style={{ '--control-height-md': '36px' } as CSSProperties}
			toggleShortcut={false}
		>
			<Sidebar
				aria-label={ariaLabel}
				className='h-full min-h-0'
				style={{ '--sidebar-width': '100%' } as CSSProperties}
			>
				<Sidebar.Content>
					<Sidebar.Group>
						<Sidebar.GroupLabel>工作区</Sidebar.GroupLabel>
						<Sidebar.Menu aria-label={ariaLabel}>
							{SIDEBAR_ITEMS.map((item) => {
								const Icon = item.icon
								return (
									<Sidebar.MenuItem
										id={`${idPrefix}-${item.id}`}
										isCurrent={selectedId === item.id}
										isDisabled={'isDisabled' in item && item.isDisabled}
										key={item.id}
										onAction={() => onSelect(item.id)}
										textValue={item.label}
									>
										<Sidebar.MenuIcon>
											<Icon aria-hidden className='size-4' />
										</Sidebar.MenuIcon>
										<Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
									</Sidebar.MenuItem>
								)
							})}
						</Sidebar.Menu>
					</Sidebar.Group>
				</Sidebar.Content>
			</Sidebar>
		</Sidebar.Provider>
	)
}

function SidebarDensityPreview() {
	const [selectedId, setSelectedId] = useState('tasks')

	return (
		<div className='flex w-full max-w-md flex-col gap-4'>
			<section
				aria-labelledby='sidebar-density-36'
				className='min-h-72 min-w-0 rounded-lg border border-surface p-3'
			>
				<h3 className='mb-2 text-sm font-medium' id='sidebar-density-36'>
					StoneFlow 36px token
				</h3>
				<SidebarFixture
					ariaLabel='StoneFlow 36px token 侧边栏'
					idPrefix='density-36'
					onSelect={setSelectedId}
					selectedId={selectedId}
				/>
			</section>
			<p aria-live='polite' className='text-sm text-muted'>
				当前项：{SIDEBAR_ITEMS.find((item) => item.id === selectedId)?.label}
			</p>
			<p className='text-xs leading-5 text-muted'>
				操作提示：点击或按 Enter/Space 切换当前项；按 Tab 进入导航后用方向键移动，观察
				Hover、Pressed 与 Keyboard Focus Visible。Lab 已选择 36px；结构、状态和交互仍使用 HeroUI Pro
				原生实现。
			</p>
		</div>
	)
}

function TabsPreview() {
	const [selectedKey, setSelectedKey] = useState('overview')

	return (
		<div className='w-full max-w-2xl'>
			<Tabs
				className='w-full'
				onSelectionChange={(key) => setSelectedKey(String(key))}
				selectedKey={selectedKey}
			>
				<Tabs.ListContainer>
					<Tabs.List aria-label='项目视图'>
						<Tabs.Tab id='overview'>
							概览
							<Tabs.Indicator />
						</Tabs.Tab>
						<Tabs.Tab id='activity'>
							<Tabs.Separator />
							动态
							<Tabs.Indicator />
						</Tabs.Tab>
						<Tabs.Tab id='reports' isDisabled>
							<Tabs.Separator />
							报表（不可用）
							<Tabs.Indicator />
						</Tabs.Tab>
					</Tabs.List>
				</Tabs.ListContainer>
				<Tabs.Panel id='overview'>
					<p className='rounded-lg bg-surface-secondary p-4 text-sm'>
						概览面板：展示当前项目的稳定摘要。
					</p>
				</Tabs.Panel>
				<Tabs.Panel id='activity'>
					<p className='rounded-lg bg-surface-secondary p-4 text-sm'>动态面板：展示最近更新。</p>
				</Tabs.Panel>
				<Tabs.Panel id='reports'>
					<p className='rounded-lg bg-surface-secondary p-4 text-sm'>报表面板。</p>
				</Tabs.Panel>
			</Tabs>
			<p className='mt-4 text-xs leading-5 text-muted'>
				操作提示：Tab 进入 TabList 后，用左右方向键切换；禁用项应被跳过，Tab 离开组件进入面板内容。
				键盘焦点只应落在当前 Tab，不应包住整个 Tabs。
			</p>
		</div>
	)
}

function PaginationPreview() {
	const [page, setPage] = useState(2)
	const totalPages = 3

	return (
		<div className='flex w-full max-w-2xl flex-col items-center gap-4'>
			<Pagination aria-label='任务分页'>
				<Pagination.Summary>
					第 {page} 页，共 {totalPages} 页
				</Pagination.Summary>
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.Previous
							isDisabled={page === 1}
							onPress={() => setPage((value) => value - 1)}
						>
							<Pagination.PreviousIcon />
							<span>上一页</span>
						</Pagination.Previous>
					</Pagination.Item>
					{[1, 2, 3].map((value) => (
						<Pagination.Item key={value}>
							<Pagination.Link isActive={page === value} onPress={() => setPage(value)}>
								{value}
							</Pagination.Link>
						</Pagination.Item>
					))}
					<Pagination.Item>
						<Pagination.Next
							isDisabled={page === totalPages}
							onPress={() => setPage((value) => value + 1)}
						>
							<span>下一页</span>
							<Pagination.NextIcon />
						</Pagination.Next>
					</Pagination.Item>
				</Pagination.Content>
			</Pagination>
			<p aria-live='polite' className='text-sm text-muted'>
				当前选择第 {page} 页
			</p>
			<p className='text-xs leading-5 text-muted'>
				操作提示：用 Tab 逐项移动并按 Enter/Space 翻页；当前页使用
				aria-current，首尾页会真实禁用对应方向按钮。
			</p>
		</div>
	)
}

function CommandPreview() {
	const [open, setOpen] = useState(false)
	const [lastAction, setLastAction] = useState('尚未执行命令')

	function runCommand(label: string) {
		setLastAction(`已执行：${label}`)
		setOpen(false)
	}

	return (
		<div className='flex w-full max-w-xl flex-col items-start gap-4'>
			<Button onPress={() => setOpen(true)} type='button' variant='secondary'>
				打开导航命令
				<Kbd className='ml-2' variant='light'>
					<Kbd.Content>Enter</Kbd.Content>
				</Kbd>
			</Button>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<p className='text-xs leading-5 text-muted'>
				操作提示：搜索区原生只有下分隔线，不应出现独立直角焦点框。打开后输入筛选，使用上下方向键移动，Enter
				执行，Escape 关闭；不可用命令应被跳过，关闭后焦点应返回触发按钮。
			</p>
			<Command>
				<Command.Backdrop isDismissable isOpen={open} onOpenChange={setOpen}>
					<Command.Container size='md'>
						<Command.Dialog aria-label='导航命令'>
							<Command.InputGroup aria-label='筛选导航命令'>
								<Command.InputGroup.Prefix>
									<SearchIcon aria-hidden className='size-4' />
								</Command.InputGroup.Prefix>
								<Command.InputGroup.Input placeholder='搜索导航命令' />
								<Command.InputGroup.ClearButton aria-label='清空命令搜索' />
							</Command.InputGroup>
							<Command.List aria-label='导航命令列表' renderEmptyState={() => '没有匹配的命令'}>
								<Command.Group heading='前往'>
									<Command.Item
										id='go-tasks'
										onAction={() => runCommand('所有任务')}
										textValue='所有任务'
									>
										<span className='flex w-full items-center gap-3'>
											<ListTodoIcon aria-hidden className='size-4 text-muted' />
											<span>所有任务</span>
										</span>
									</Command.Item>
									<Command.Item
										id='go-settings'
										onAction={() => runCommand('设置')}
										textValue='设置'
									>
										<span className='flex w-full items-center gap-3'>
											<Settings2Icon aria-hidden className='size-4 text-muted' />
											<span>设置</span>
										</span>
									</Command.Item>
									<Command.Item id='go-shared' isDisabled textValue='共享空间 尚未接入'>
										<span className='flex w-full items-center justify-between gap-3'>
											<span>共享空间</span>
											<span className='text-xs text-muted'>尚未接入</span>
										</span>
									</Command.Item>
								</Command.Group>
							</Command.List>
						</Command.Dialog>
					</Command.Container>
				</Command.Backdrop>
			</Command>
		</div>
	)
}

function ShellViewport({ narrow }: { narrow: boolean }) {
	const [selectedId, setSelectedId] = useState('project')
	const label = narrow ? '窄容器 320px' : '常规宽度'

	return (
		<section aria-label={label} className={narrow ? 'w-[320px] max-w-full' : 'w-full'}>
			<h3 className='mb-2 text-sm font-medium'>{label}</h3>
			<div
				className='grid min-h-72 min-w-0 overflow-hidden rounded-lg border border-surface bg-background'
				style={{ gridTemplateColumns: narrow ? '8rem minmax(0, 1fr)' : '12rem minmax(0, 1fr)' }}
			>
				<div className='min-w-0 bg-surface-secondary p-2'>
					<SidebarFixture
						ariaLabel={`${label} Shell 导航`}
						idPrefix={narrow ? 'shell-narrow' : 'shell-regular'}
						onSelect={setSelectedId}
						selectedId={selectedId}
					/>
				</div>
				<div className='min-w-0 p-4'>
					<p className='text-xs text-muted'>工作区 / 项目</p>
					<h4 className='mt-1 warp-break-words text-base font-semibold'>
						用于观察长中文标题在有限空间内如何换行而不挤压导航结构
					</h4>
					<div className='mt-4 space-y-2 text-sm text-muted'>
						<p>当前导航：{SIDEBAR_ITEMS.find((item) => item.id === selectedId)?.label}</p>
						<p>这是最小 Shell 证据面，不包含路由、Store、Query 或 Tauri 装配。</p>
					</div>
				</div>
			</div>
		</section>
	)
}

function ShellSidebarPreview() {
	return (
		<div className='flex w-full max-w-4xl flex-col gap-6'>
			<ShellViewport narrow={false} />
			<ShellViewport narrow />
		</div>
	)
}

export const TICKET_04_SAMPLES = [
	{
		id: 'stoneflow-breadcrumb',
		name: 'Breadcrumb',
		view: 'stoneflow',
		category: 'Navigation',
		description:
			'用真实 AppBreadcrumb 审查祖先链接、当前项与 aria-current; Lab 先预览已选 Ghost 视觉，生产组件暂不修改。',
		keywords: ['breadcrumb', 'breadcrumbs', '面包屑', '链接', 'current'],
		owner: '共享 AppBreadcrumb',
		source: 'src/shared/components/AppBreadcrumb.tsx',
		coverage: 'rendered',
		states: 'Rest、Hover、Keyboard Focus Visible、Current、长中文',
		verification: 'Lab 可验证目标视觉；真实路由跳转与生产迁移仍在后续任务验证',
		Preview: BreadcrumbPreview,
	},
	{
		id: 'stoneflow-sidebar-density',
		name: 'Sidebar',
		view: 'stoneflow',
		category: 'Navigation',
		description: '以 36px 高度审查 HeroUI Pro Sidebar 的原生结构、状态和键盘交互。',
		keywords: ['sidebar', '侧边栏', '36px', 'density', '密度'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8；src/styles/theme.css',
		coverage: 'rendered',
		states: 'Rest、Hover、Pressed、Current、Keyboard Focus Visible、Disabled、长中文',
		verification: 'Lab 已选定 36px；生产 token 留到后续统一任务修改',
		Preview: SidebarDensityPreview,
	},
	{
		id: 'stoneflow-tabs',
		name: 'Tabs',
		view: 'stoneflow',
		category: 'Navigation',
		description: '检查真实 TabList 的选择态、禁用态、面板关联与方向键路径。',
		keywords: ['tabs', 'tab', '标签页', '选中', '方向键'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4；src/styles/theme.css',
		coverage: 'rendered',
		states: 'Rest、Hover、Selected、Keyboard Focus Visible、Disabled',
		verification: 'Lab 可验证',
		Preview: TabsPreview,
	},
	{
		id: 'stoneflow-pagination',
		name: 'Pagination',
		view: 'stoneflow',
		category: 'Navigation',
		description: '检查真实分页的当前页、首尾禁用与键盘逐项导航。',
		keywords: ['pagination', '分页', '上一页', '下一页', 'current'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4；src/styles/theme.css',
		coverage: 'rendered',
		states: 'Rest、Hover、Pressed、Current、Keyboard Focus Visible、Disabled',
		verification: 'Lab 可验证',
		Preview: PaginationPreview,
	},
	{
		id: 'stoneflow-command-navigation',
		name: 'Command',
		view: 'stoneflow',
		category: 'Navigation',
		description: '用最小无业务命令集检查 HeroUI Pro Command 的筛选、焦点移动、禁用与退出路径。',
		keywords: ['command', '命令', '命令面板', 'keyboard', '导航'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Closed、Open、Focused、Pressed、Disabled、Escape、Focus Restore',
		verification: 'Lab 可验证上游组件；产品命令执行仅真实应用验证',
		Preview: CommandPreview,
	},
	{
		id: 'stoneflow-settings-navigation',
		name: 'Settings Navigation',
		view: 'stoneflow',
		category: 'Navigation',
		description:
			'不单独审查一张“Settings”组件；功能已有自动测试，只在 Main 人工检查导航视觉与窄宽度布局。',
		keywords: ['settings', 'navigation', '设置', '设置导航', 'sidebar'],
		owner: 'Settings feature',
		source: 'src/features/settings/index.ts',
		coverage: 'real-app-only',
		states: '自动：Current、返回、分区跳转；人工：Hover、Keyboard Focus、长中文、窄宽度',
		verification: '行为已有组件测试；视觉仅在真实应用逐项验收',
		reason:
			'SettingsSidebar 依赖真实 TanStack Router、当前 Scope、返回路径与持久化分区状态，因此 UI Lab 不复制导航 JSX。现有自动测试已覆盖当前分区、返回原路径和分区跳转；请在 Main 只人工审查 Hover、Keyboard Focus、长中文截断与窄 Sidebar 布局。',
	},
	{
		id: 'stoneflow-shell-sidebar-scene',
		name: 'Shell / Sidebar',
		view: 'stoneflow',
		category: 'Product Scenes',
		description: '在无业务依赖的最小 Shell 中检查常规、320px 窄容器与长中文层级。',
		keywords: ['shell', 'sidebar', '产品场景', '窄容器', '320px', '长中文'],
		owner: 'UI Lab fixture',
		source: 'src/ui-lab/samples/ticket-04/navigationSamples.tsx；@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Current、Hover、Keyboard Focus Visible、Disabled、长中文、窄容器',
		verification: 'Lab 可验证组合；窗口、路由、Store 与 Tauri 仅真实应用验证',
		Preview: ShellSidebarPreview,
	},
] as const satisfies readonly UiLabSample[]
