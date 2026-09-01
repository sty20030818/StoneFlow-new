import { useState, type ReactNode } from 'react'

import {
	AlertDialog,
	Button,
	Chip,
	Disclosure,
	Dropdown,
	Kbd,
	Label,
	ListBox,
	Modal,
	Popover,
	ScrollShadow,
	Separator,
	Surface,
} from '@heroui/react'
import {
	ActionBar,
	CellSelect,
	CellSwitch,
	Command,
	ContextMenu,
	EmptyState,
	HoverCard,
	InlineSelect,
	ListView,
	Sheet,
	Timeline,
} from '@heroui-pro/react'
import { Resizable } from '@heroui-pro/react/resizable'
import { ChevronDownIcon, SearchIcon, Trash2Icon } from 'lucide-react'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'

function Fixture({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className='flex min-w-0 flex-col gap-4 font-sans'>
			<h3 className='text-base font-semibold'>{title}</h3>
			{children}
			<p className='text-xs leading-5 text-muted'>
				只验证锁定版本公共 API；真实 Router、Store、Tauri 与 WebView 行为留在产品验收。
			</p>
		</div>
	)
}

function MenuFixture() {
	const [lastAction, setLastAction] = useState('尚未执行菜单动作')

	return (
		<Fixture title='Menu'>
			<div className='flex flex-wrap items-center gap-2'>
				<Dropdown>
					<Button type='button' variant='secondary'>
						Dropdown
					</Button>
					<Dropdown.Popover>
						<Dropdown.Menu
							aria-label='任务动作'
							onAction={(key) => setLastAction(`Dropdown：${String(key)}`)}
						>
							<Dropdown.Item id='open' textValue='打开任务'>
								<Label>打开任务</Label>
							</Dropdown.Item>
							<Dropdown.Item id='pin' textValue='固定任务'>
								<Label>固定任务</Label>
								<Kbd slot='keyboard' variant='light'>
									<Kbd.Content>P</Kbd.Content>
								</Kbd>
							</Dropdown.Item>
							<Dropdown.Item id='managed' isDisabled textValue='由组织管理'>
								<Label>由组织管理</Label>
							</Dropdown.Item>
							<Dropdown.Item id='delete' textValue='移到回收站' variant='danger'>
								<Label>移到回收站</Label>
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>

				<Popover>
					<Button type='button' variant='secondary'>
						Popover
					</Button>
					<Popover.Content>
						<Popover.Dialog aria-label='排序说明'>
							<Popover.Heading>排序说明</Popover.Heading>
							<p className='mt-2 max-w-64 text-sm text-muted'>当前列表按截止日期排列。</p>
						</Popover.Dialog>
					</Popover.Content>
				</Popover>

				<ContextMenu>
					<ContextMenu.Trigger tabIndex={0}>
						<div className='cursor-context-menu rounded-lg border border-dashed border-border px-3 py-2 text-sm'>
							右键区域
						</div>
					</ContextMenu.Trigger>
					<ContextMenu.Popover>
						<ContextMenu.Menu
							aria-label='任务上下文动作'
							onAction={(key) => setLastAction(`ContextMenu：${String(key)}`)}
						>
							<ContextMenu.Item id='rename' textValue='重命名'>
								<Label>重命名</Label>
							</ContextMenu.Item>
							<ContextMenu.Separator />
							<ContextMenu.Item id='delete' textValue='永久删除' variant='danger'>
								<Label>永久删除</Label>
							</ContextMenu.Item>
						</ContextMenu.Menu>
					</ContextMenu.Popover>
				</ContextMenu>
			</div>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
		</Fixture>
	)
}

function OverlaysFixture() {
	return (
		<Fixture title='Overlays'>
			<div className='flex flex-wrap gap-2'>
				<Modal>
					<Button type='button' variant='secondary'>
						打开 Modal
					</Button>
					<Modal.Backdrop>
						<Modal.Container size='sm'>
							<Modal.Dialog>
								<Modal.CloseTrigger aria-label='关闭 Modal' />
								<Modal.Header>
									<Modal.Heading>编辑任务</Modal.Heading>
								</Modal.Header>
								<Modal.Body>这是无副作用的 Modal 焦点样本。</Modal.Body>
								<Modal.Footer>
									<Button slot='close' type='button'>
										完成
									</Button>
								</Modal.Footer>
							</Modal.Dialog>
						</Modal.Container>
					</Modal.Backdrop>
				</Modal>

				<AlertDialog>
					<Button type='button' variant='danger-soft'>
						打开危险确认
					</Button>
					<AlertDialog.Backdrop>
						<AlertDialog.Container>
							<AlertDialog.Dialog>
								<AlertDialog.Header>
									<AlertDialog.Icon status='danger' />
									<AlertDialog.Heading>移到回收站？</AlertDialog.Heading>
								</AlertDialog.Header>
								<AlertDialog.Body>这里只验证危险语义，不会修改数据。</AlertDialog.Body>
								<AlertDialog.Footer>
									<Button autoFocus slot='close' type='button' variant='tertiary'>
										取消
									</Button>
									<Button slot='close' type='button' variant='danger'>
										确认删除
									</Button>
								</AlertDialog.Footer>
							</AlertDialog.Dialog>
						</AlertDialog.Container>
					</AlertDialog.Backdrop>
				</AlertDialog>

				<Sheet placement='right' shouldAutoFocus>
					<Sheet.Trigger>
						<Button type='button' variant='secondary'>
							打开 Sheet
						</Button>
					</Sheet.Trigger>
					<Sheet.Backdrop>
						<Sheet.Content className='w-[min(24rem,calc(100vw-1rem))]'>
							<Sheet.Dialog>
								<Sheet.CloseTrigger aria-label='关闭 Sheet' />
								<Sheet.Header>
									<Sheet.Heading>任务详情</Sheet.Heading>
								</Sheet.Header>
								<Sheet.Body>这里只验证 Sheet 公共结构与关闭路径。</Sheet.Body>
								<Sheet.Footer>
									<Sheet.Close>
										<Button type='button'>完成</Button>
									</Sheet.Close>
								</Sheet.Footer>
							</Sheet.Dialog>
						</Sheet.Content>
					</Sheet.Backdrop>
				</Sheet>
			</div>
		</Fixture>
	)
}

function NavigationFixture() {
	return (
		<Fixture title='Navigation（Disclosure 折叠面板）'>
			<Disclosure defaultExpanded>
				<Disclosure.Heading>
					<Disclosure.Trigger>
						<span className='inline-flex items-center gap-2 font-medium'>
							详情与诊断
							<Disclosure.Indicator />
						</span>
					</Disclosure.Trigger>
				</Disclosure.Heading>
				<Disclosure.Content>
					<Disclosure.Body>
						<p className='text-sm leading-6 text-muted'>
							使用真实 Disclosure；方向键与展开状态由上游负责。
						</p>
					</Disclosure.Body>
				</Disclosure.Content>
			</Disclosure>
			<p className='text-sm text-muted'>
				本样例审查折叠面板；Tabs 没有生产消费者，仅保留在组件总账。
			</p>
		</Fixture>
	)
}

function CollectionsFixture() {
	const [lastAction, setLastAction] = useState('尚未打开搜索结果')

	return (
		<Fixture title='Collections'>
			<ListView
				aria-label='搜索结果'
				className='max-w-lg'
				onAction={(key) => setLastAction(`已打开：${String(key)}`)}
				selectionMode='none'
				variant='primary'
			>
				<ListView.Item id='task-1' textValue='整理复杂控件对照'>
					<ListView.ItemContent>
						<div className='flex min-w-0 flex-col gap-1'>
							<ListView.Title>整理复杂控件对照</ListView.Title>
							<ListView.Description>Task · UI Lab</ListView.Description>
						</div>
					</ListView.ItemContent>
					<ListView.ItemAction>
						<span className='text-xs text-muted'>今天</span>
					</ListView.ItemAction>
				</ListView.Item>
				<ListView.Item id='task-2' isDisabled textValue='不可用的归档任务'>
					<ListView.ItemContent>
						<div className='flex min-w-0 flex-col gap-1'>
							<ListView.Title>不可用的归档任务</ListView.Title>
							<ListView.Description>Archive</ListView.Description>
						</div>
					</ListView.ItemContent>
				</ListView.Item>
			</ListView>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<p className='text-sm text-muted'>Table 当前没有产品数据表需求，仅保留在组件总账。</p>
		</Fixture>
	)
}

function CommandFixture() {
	const [open, setOpen] = useState(false)
	const [lastAction, setLastAction] = useState('尚未执行命令')

	function runCommand(label: string) {
		setLastAction(`已执行：${label}`)
		setOpen(false)
	}

	return (
		<Fixture title='Command'>
			<Button onPress={() => setOpen(true)} type='button' variant='secondary'>
				打开命令面板
				<Kbd className='ml-2' variant='light'>
					M
				</Kbd>
			</Button>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<Command>
				<Command.Backdrop isDismissable isOpen={open} onOpenChange={setOpen}>
					<Command.Container size='md'>
						<Command.Dialog aria-label='审查命令'>
							<Command.InputGroup aria-label='筛选审查命令'>
								<Command.InputGroup.Prefix>
									<SearchIcon aria-hidden className='size-4 shrink-0' />
								</Command.InputGroup.Prefix>
								<Command.InputGroup.Input placeholder='搜索命令' />
								<Command.InputGroup.ClearButton aria-label='清空命令搜索' />
							</Command.InputGroup>
							<Command.List aria-label='审查命令列表' renderEmptyState={() => '没有匹配命令'}>
								<Command.Group heading='前往'>
									<Command.Item
										id='all-tasks'
										onAction={() => runCommand('所有任务')}
										textValue='所有任务'
									>
										<span className='flex w-full items-center justify-between gap-3'>
											<span>所有任务</span>
											<Kbd variant='light'>Enter</Kbd>
										</span>
									</Command.Item>
									<Command.Item id='managed' isDisabled textValue='共享空间尚未接入'>
										共享空间（尚未接入）
									</Command.Item>
								</Command.Group>
							</Command.List>
						</Command.Dialog>
					</Command.Container>
				</Command.Backdrop>
			</Command>
		</Fixture>
	)
}

function ActionBarFixture() {
	const [open, setOpen] = useState(true)

	return (
		<Fixture title='ActionBar'>
			<Button onPress={() => setOpen(true)} type='button' variant='secondary'>
				恢复批量操作栏
			</Button>
			<p className='text-sm text-muted'>
				ActionBar 使用上游真实 viewport-fixed 定位，不伪装为卡片内容。
			</p>
			<ActionBar aria-label='批量操作样本' isOpen={open}>
				<ActionBar.Prefix>
					<Chip className='shrink-0' size='sm'>
						2
					</Chip>
				</ActionBar.Prefix>
				<Separator />
				<ActionBar.Content>
					<Button size='sm' type='button' variant='tertiary'>
						移动
					</Button>
					<Button isDisabled size='sm' type='button' variant='tertiary'>
						归档
					</Button>
					<Separator orientation='vertical' />
					<Button aria-label='删除' size='sm' type='button' variant='danger'>
						<Trash2Icon aria-hidden />
						<span className='action-bar__label'>删除</span>
					</Button>
				</ActionBar.Content>
				<Separator />
				<ActionBar.Suffix>
					<Button
						aria-label='清空已选'
						isIconOnly
						onPress={() => setOpen(false)}
						size='sm'
						variant='tertiary'
					>
						×
					</Button>
				</ActionBar.Suffix>
			</ActionBar>
		</Fixture>
	)
}

const SPACE_OPTIONS = [
	{ id: 'personal', label: '个人空间' },
	{ id: 'team', label: '团队空间' },
] as const

function CellControlsFixture() {
	const [syncEnabled, setSyncEnabled] = useState(true)
	const [space, setSpace] = useState('personal')
	const [priority, setPriority] = useState('medium')

	return (
		<Fixture title='Cell Controls'>
			<div className='flex max-w-lg flex-col gap-3'>
				<CellSwitch aria-label='后台同步' isSelected={syncEnabled} onChange={setSyncEnabled}>
					<CellSwitch.Trigger>
						<CellSwitch.Label>后台同步</CellSwitch.Label>
						<CellSwitch.Control />
					</CellSwitch.Trigger>
				</CellSwitch>

				<CellSelect
					aria-label='默认空间'
					fullWidth
					onChange={(key) => typeof key === 'string' && setSpace(key)}
					value={space}
				>
					<CellSelect.Trigger>
						<CellSelect.Label>默认空间</CellSelect.Label>
						<CellSelect.Value />
						<CellSelect.Indicator />
					</CellSelect.Trigger>
					<CellSelect.Popover>
						<ListBox>
							{SPACE_OPTIONS.map((item) => (
								<ListBox.Item id={item.id} key={item.id} textValue={item.label}>
									<Label>{item.label}</Label>
									<ListBox.ItemIndicator />
								</ListBox.Item>
							))}
						</ListBox>
					</CellSelect.Popover>
				</CellSelect>

				<div className='flex items-center gap-2 text-sm'>
					<span>优先级</span>
					<InlineSelect
						aria-label='优先级'
						onChange={(key) => typeof key === 'string' && setPriority(key)}
						value={priority}
					>
						<InlineSelect.Trigger>
							<InlineSelect.Value />
							<InlineSelect.Indicator>
								<ChevronDownIcon aria-hidden className='size-3' />
							</InlineSelect.Indicator>
						</InlineSelect.Trigger>
						<InlineSelect.Popover className='w-24'>
							<ListBox>
								<ListBox.Item id='high' textValue='高'>
									高
									<ListBox.ItemIndicator />
								</ListBox.Item>
								<ListBox.Item id='medium' textValue='中'>
									中
									<ListBox.ItemIndicator />
								</ListBox.Item>
							</ListBox>
						</InlineSelect.Popover>
					</InlineSelect>
				</div>
			</div>
		</Fixture>
	)
}

function LayoutSurfacesFixture() {
	return (
		<Fixture title='Layout Surfaces'>
			<div className='h-44 overflow-hidden rounded-lg border border-separator'>
				<Resizable className='h-full' orientation='horizontal'>
					<Resizable.Panel defaultSize={55} id='list' minSize={30}>
						<Surface className='h-full p-3' variant='secondary'>
							<p className='text-sm font-medium'>任务列表</p>
							<p className='mt-1 text-xs text-muted'>Surface 提供分层，不拥有业务布局。</p>
						</Surface>
					</Resizable.Panel>
					<Resizable.Handle aria-label='调整样本宽度' type='line' variant='secondary' />
					<Resizable.Panel defaultSize={45} id='detail' minSize={30}>
						<ScrollShadow className='h-full p-3'>
							<p className='text-sm font-medium'>任务详情</p>
							{Array.from({ length: 8 }, (_, index) => (
								<p className='mt-2 text-xs leading-5 text-muted' key={index}>
									第 {index + 1} 条用于验证滚动边界的内容。
								</p>
							))}
						</ScrollShadow>
					</Resizable.Panel>
				</Resizable>
			</div>
		</Fixture>
	)
}

function TimelineHoverCardFixture() {
	return (
		<Fixture title='Timeline / HoverCard'>
			<Timeline aria-label='任务活动样本' density='compact' size='sm'>
				<Timeline.Item status='current'>
					<Timeline.Rail>
						<Timeline.Marker />
						<Timeline.Connector />
					</Timeline.Rail>
					<Timeline.Content>
						<p className='text-sm'>石头鱼更新了任务标题</p>
						<p className='text-xs text-muted'>2 分钟前</p>
					</Timeline.Content>
				</Timeline.Item>
				<Timeline.Item>
					<Timeline.Rail>
						<Timeline.Marker />
						<Timeline.Connector />
					</Timeline.Rail>
					<Timeline.Content>
						<p className='text-sm'>任务已加入 UI Lab 项目</p>
						<p className='text-xs text-muted'>昨天</p>
					</Timeline.Content>
				</Timeline.Item>
			</Timeline>
			<HoverCard closeDelay={0} openDelay={0}>
				<HoverCard.Trigger>
					<Button type='button' variant='ghost'>
						预览任务
					</Button>
				</HoverCard.Trigger>
				<HoverCard.Content placement='bottom start'>
					<HoverCard.Arrow />
					<div className='max-w-64 p-3'>
						<p className='text-sm font-medium'>整理 HeroUI 原生对照</p>
						<p className='mt-1 text-xs leading-5 text-muted'>
							候选只验证上游交互，不读取真实查询。
						</p>
					</div>
				</HoverCard.Content>
			</HoverCard>
		</Fixture>
	)
}

function EmptyStateFixture() {
	return (
		<Fixture title='EmptyState'>
			<EmptyState size='sm'>
				<EmptyState.Header>
					<EmptyState.Title>没有匹配的任务</EmptyState.Title>
					<EmptyState.Description>
						这是 Launcher 与空集合的真实语义；组件不拥有恢复策略。
					</EmptyState.Description>
				</EmptyState.Header>
				<EmptyState.Content>
					<Button type='button' variant='outline'>
						清空筛选
					</Button>
				</EmptyState.Content>
			</EmptyState>
			<p className='text-sm text-muted'>OSS EmptyState 没有生产消费者，仅保留在组件总账。</p>
		</Fixture>
	)
}

export const TICKET_10_NATIVE_FIXTURES = {
	'complex-menu': { label: 'Menu', Preview: MenuFixture },
	'complex-overlays': { label: 'Overlays', Preview: OverlaysFixture },
	'complex-navigation': { label: 'Navigation', Preview: NavigationFixture },
	'complex-collections': { label: 'Collections', Preview: CollectionsFixture },
	'complex-command': { label: 'Command', Preview: CommandFixture },
	'complex-action-bar': { label: 'ActionBar', Preview: ActionBarFixture },
	'complex-cell-controls': { label: 'Cell Controls', Preview: CellControlsFixture },
	'complex-layout-surfaces': { label: 'Layout Surfaces', Preview: LayoutSurfacesFixture },
	'complex-timeline-hover-card': {
		label: 'Timeline / HoverCard',
		Preview: TimelineHoverCardFixture,
	},
	'complex-empty-state': { label: 'EmptyState', Preview: EmptyStateFixture },
} as const

export const TICKET_10_SAMPLES = (
	[
		{
			id: 'heroui-complex-menu-review',
			name: 'Menu',
			description: '核对 Dropdown、ContextMenu 与 Popover 的公开菜单、危险项、禁用和关闭路径。',
			keywords: ['dropdown', 'context menu', 'popover', '菜单'],
			inventoryRefs: ['heroui-oss-dropdown', 'heroui-pro-context-menu', 'heroui-oss-popover'],
			comparisonFixture: 'complex-menu',
			states: 'Open、Keyboard Navigation、Disabled、Danger、Escape、Focus Return',
			verification: '三层同 fixture；真实业务命令与触屏长按留在产品验收',
		},
		{
			id: 'heroui-complex-overlays-review',
			name: 'Overlays',
			description: '核对 Modal、AlertDialog 与 Sheet 在隔离 Document 内的 Portal 和焦点合同。',
			keywords: ['modal', 'alert dialog', 'sheet', 'portal', '浮层'],
			inventoryRefs: ['heroui-modal', 'heroui-oss-alert-dialog', 'heroui-pro-sheet'],
			comparisonFixture: 'complex-overlays',
			states: 'Open、Initial Focus、Tab Loop、Escape、Danger、Cleanup',
			verification: 'Portal 留在各自 Document；真实 Shell 焦点与 WebView Portal 为 real-app-only',
		},
		{
			id: 'heroui-complex-navigation-review',
			name: 'Navigation',
			description: '渲染真实 Disclosure；没有产品消费者的 Tabs 维持 ledger-only。',
			keywords: ['disclosure', 'tabs', '导航', '展开'],
			inventoryRefs: ['heroui-oss-disclosure', 'heroui-oss-tabs'],
			comparisonFixture: 'complex-navigation',
			states: 'Collapsed、Expanded、Focus-visible；Tabs ledger-only',
			verification: '三层同 fixture；不虚构产品 Tab 场景',
		},
		{
			id: 'heroui-complex-collections-review',
			name: 'Collections',
			description: '用全局搜索语义核对 ListView；没有产品需求的 Table 维持 ledger-only。',
			keywords: ['listview', 'table', 'collection', '搜索结果'],
			inventoryRefs: ['heroui-list-view', 'heroui-oss-table'],
			comparisonFixture: 'complex-collections',
			states: 'Hover、Action、Disabled、Keyboard Navigation；Table ledger-only',
			verification: '三层同 fixture；真实搜索排序与路由留在产品场景',
		},
		{
			id: 'heroui-complex-command-review',
			name: 'Command',
			description: '核对 Command 的搜索、方向键、禁用、Enter、Escape 与焦点恢复。',
			keywords: ['command', 'keyboard', '命令', '快捷键'],
			inventoryRefs: ['heroui-pro-command'],
			comparisonFixture: 'complex-command',
			states: 'Open、Filter、Keyboard Navigation、Disabled、Enter、Escape',
			verification: '三层同 fixture；全局快捷键、Router 与 Command Runtime 为 real-app-only',
		},
		{
			id: 'heroui-complex-action-bar-review',
			name: 'ActionBar',
			description: '核对批量选择数量、普通/禁用/危险动作与清空入口。',
			keywords: ['action bar', 'bulk', 'selection', '批量操作'],
			inventoryRefs: ['heroui-pro-action-bar'],
			comparisonFixture: 'complex-action-bar',
			states: 'Open、Disabled、Danger、Clear、Viewport-fixed',
			verification: '三层同 fixture；真实 SelectionManager 和安全区为 real-app-only',
		},
		{
			id: 'heroui-complex-cell-controls-review',
			name: 'Cell Controls',
			description: '核对 CellSwitch、CellSelect，并把公开 InlineSelect 作为 Metadata 候选展示。',
			keywords: ['cell switch', 'cell select', 'inline select', 'metadata'],
			inventoryRefs: [
				'heroui-pro-cell-switch',
				'heroui-pro-cell-select',
				'heroui-pro-inline-select',
			],
			comparisonFixture: 'complex-cell-controls',
			states: 'Selected、Open、Keyboard Navigation、Focus-visible',
			verification: '三层同 fixture；候选不表示 Metadata 迁移获批',
		},
		{
			id: 'heroui-complex-layout-surfaces-review',
			name: 'Layout Surfaces',
			description: '核对 Resizable、ScrollShadow 与 Surface 的上游布局原料，不复制详情抽屉组合。',
			keywords: ['resizable', 'scroll shadow', 'surface', '布局'],
			inventoryRefs: ['heroui-pro-resizable', 'heroui-oss-scroll-shadow', 'heroui-oss-surface'],
			comparisonFixture: 'complex-layout-surfaces',
			states: 'Resize、Scroll Boundary、Surface Layer、Narrow Width',
			verification: '三层同 fixture；Entity Detail 组合与持久化留给产品场景',
		},
		{
			id: 'heroui-complex-timeline-hover-card-review',
			name: 'Timeline / HoverCard',
			description: '核对 Activity Timeline，并把 HoverCard 作为 Task Preview 候选展示。',
			keywords: ['timeline', 'hover card', 'activity', 'task preview'],
			inventoryRefs: ['heroui-pro-timeline', 'heroui-pro-hover-card'],
			comparisonFixture: 'complex-timeline-hover-card',
			states: 'Timeline Status、Hover、Focus、Escape、Portal',
			verification: '三层同 fixture；真实查询、延时与 Preview 生命周期为 real-app-only',
		},
		{
			id: 'heroui-complex-empty-state-review',
			name: 'EmptyState',
			description: '使用 Pro EmptyState 展示 Launcher/空集合语义；OSS 版本维持 ledger-only。',
			keywords: ['empty state', 'launcher', '空集合', '恢复'],
			inventoryRefs: ['heroui-empty-state', 'heroui-oss-empty-state'],
			comparisonFixture: 'complex-empty-state',
			states: 'Empty Reason、Recovery Action、Narrow Width；OSS ledger-only',
			verification: '三层同 fixture；恢复策略仍归真实产品场景',
		},
	] as const
).map((sample) => ({
	...sample,
	view: 'heroui' as const,
	category: '已采用',
	owner: 'Upstream',
	recommendedOwner: 'Upstream',
	source: '@heroui/react@3.2.4；@heroui-pro/react@1.0.0-beta.8',
	coverage: 'rendered' as const,
	disposition: 'keep' as const,
})) satisfies readonly UiLabReviewUnitInput[]
