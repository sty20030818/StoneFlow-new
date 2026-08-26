import { useId, useState, type ReactNode } from 'react'

import { ListView } from '@heroui-pro/react'
import {
	Avatar,
	Badge,
	Button,
	Checkbox,
	Chip,
	Description,
	Dropdown,
	Kbd,
	Label,
	ListBox,
	Table,
	Tag,
	TagGroup,
	type Selection,
} from '@heroui/react'
import {
	CalendarDaysIcon,
	CheckCircle2Icon,
	CircleIcon,
	EllipsisIcon,
	FolderIcon,
	InboxIcon,
	Trash2Icon,
} from 'lucide-react'

import { RowShell } from '@/shared/components/row'

import type { UiLabSample } from '../../uiLabCatalog'

const LONG_TITLE = '把跨窗口同步失败后的恢复路径整理成一条可复现、可验证且能长期维护的规则'

function RowShellPreview() {
	const [selected, setSelected] = useState('selected')
	const [status, setStatus] = useState('当前行：选中事项')
	const rows = [
		{ id: 'normal', title: '普通事项' },
		{ id: 'selected', title: '选中事项' },
		{ id: 'action', title: '含尾部操作', hasAction: true },
		{ id: 'disabled', title: '禁用事项', isDisabled: true },
		{ id: 'long', title: LONG_TITLE },
	]

	return (
		<div className='w-full max-w-3xl'>
			<h3 className='text-base font-semibold'>RowShell</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				共享 RowShell 只负责行的密度与状态外壳；主操作和尾部操作继续使用原生可聚焦控件。
			</p>
			<div className='mt-4 overflow-hidden rounded-lg border border-surface'>
				{rows.map((row, index) => (
					<RowShell
						key={row.id}
						selected={selected === row.id}
						selectionGroupPosition={
							index === 0 ? 'first' : index === rows.length - 1 ? 'last' : 'middle'
						}
					>
						<button
							aria-pressed={selected === row.id}
							className='min-w-0 flex-1 truncate text-left outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
							disabled={row.isDisabled}
							onClick={() => {
								setSelected(row.id)
								setStatus(`当前行：${row.title}`)
							}}
							title={row.title}
							type='button'
						>
							{row.title}
						</button>
						{row.hasAction ? (
							<span className='shrink-0 opacity-0 group-has-focus-visible/row-shell:opacity-100 group-hover/row-shell:opacity-100'>
								<Button
									aria-label='更多操作：含尾部操作'
									isIconOnly
									onPress={() => setStatus('已触发：含尾部操作')}
									size='sm'
									type='button'
									variant='ghost'
								>
									<EllipsisIcon aria-hidden className='size-4' />
								</Button>
							</span>
						) : null}
					</RowShell>
				))}
			</div>
			<p className='mt-3 text-sm text-muted' role='status'>
				{status}
			</p>
		</div>
	)
}

function MenuPreview() {
	const [status, setStatus] = useState('尚未执行菜单操作')

	return (
		<div className='flex w-full max-w-lg flex-col items-start gap-4'>
			<h3 className='text-base font-semibold'>Menu</h3>
			<Dropdown>
				<Button type='button' variant='ghost'>
					操作菜单
					<EllipsisIcon aria-hidden className='size-4' />
				</Button>
				<Dropdown.Popover>
					<Dropdown.Menu
						aria-label='任务操作菜单'
						defaultSelectedKeys={['打开任务']}
						disabledKeys={['移动到已归档空间']}
						onAction={(key) => setStatus(`已执行：${String(key)}`)}
						selectionMode='single'
					>
						<Dropdown.Item id='打开任务' textValue='打开任务'>
							<Label>打开任务</Label>
							<Kbd>
								<Kbd.Content>↵</Kbd.Content>
							</Kbd>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
						<Dropdown.Item id='复制为新的待办事项' textValue='复制为新的待办事项'>
							<Label>复制为新的待办事项</Label>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
						<Dropdown.Item id={LONG_TITLE} textValue={LONG_TITLE}>
							<Label>{LONG_TITLE}</Label>
							<Dropdown.ItemIndicator />
						</Dropdown.Item>
						<Dropdown.Item id='移动到已归档空间' textValue='移动到已归档空间'>
							<Label>移动到已归档空间（不可用）</Label>
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown>
			<p className='text-sm text-muted' role='status'>
				{status}
			</p>
		</div>
	)
}

function ListBoxPreview() {
	const [selected, setSelected] = useState<Selection>(new Set(['产品审查']))
	const current = selected === 'all' ? '全部' : (Array.from(selected)[0] ?? '未选择')

	return (
		<div className='w-full max-w-lg'>
			<h3 className='text-base font-semibold'>ListBox</h3>
			<div className='mt-4 rounded-lg border border-surface bg-surface p-2'>
				<ListBox
					aria-label='任务视图'
					disabledKeys={['长期归档']}
					onSelectionChange={setSelected}
					selectedKeys={selected}
					selectionMode='single'
				>
					<ListBox.Item id='收件箱' textValue='收件箱'>
						<InboxIcon aria-hidden className='size-4 text-muted' />
						<Label>收件箱</Label>
						<ListBox.ItemIndicator />
					</ListBox.Item>
					<ListBox.Item id='产品审查' textValue='产品审查'>
						<CheckCircle2Icon aria-hidden className='size-4 text-muted' />
						<div className='min-w-0'>
							<Label>产品审查</Label>
							<Description>当前选中项</Description>
						</div>
						<ListBox.ItemIndicator />
					</ListBox.Item>
					<ListBox.Item id={LONG_TITLE} textValue={LONG_TITLE}>
						<CircleIcon aria-hidden className='size-4 text-muted' />
						<div className='min-w-0'>
							<Label>{LONG_TITLE}</Label>
							<Description>缩窄容器检查文本溢出</Description>
						</div>
						<ListBox.ItemIndicator />
					</ListBox.Item>
					<ListBox.Item id='长期归档' textValue='长期归档'>
						<Label>长期归档（不可用）</Label>
					</ListBox.Item>
				</ListBox>
			</div>
			<p className='mt-3 text-sm text-muted'>当前选择：{current}</p>
		</div>
	)
}

function ListViewPreview() {
	const [selected, setSelected] = useState<Selection>(new Set(['review']))
	const [status, setStatus] = useState('尾部操作尚未触发')
	const items = [
		{ id: 'inbox', title: '收件箱', description: '普通状态' },
		{ id: 'review', title: '产品审查', description: '默认选中，包含尾部操作' },
		{ id: 'long', title: LONG_TITLE, description: '长中文与溢出状态' },
		{ id: 'archive', title: '长期归档', description: '禁用状态', isDisabled: true },
	]

	return (
		<div className='w-full max-w-2xl'>
			<h3 className='text-base font-semibold'>ListView</h3>
			<ListView
				aria-label='工作区列表'
				disabledKeys={['archive']}
				items={items}
				onSelectionChange={setSelected}
				selectedKeys={selected}
				selectionMode='single'
				variant='secondary'
			>
				{(item) => (
					<ListView.Item id={item.id} textValue={item.title}>
						<ListView.ItemContent>
							<FolderIcon aria-hidden className='size-4 text-muted' />
							<div className='min-w-0'>
								<ListView.Title>{item.title}</ListView.Title>
								<ListView.Description>{item.description}</ListView.Description>
							</div>
						</ListView.ItemContent>
						{item.id === 'review' ? (
							<ListView.ItemAction>
								<Button
									aria-label='删除产品审查'
									isIconOnly
									onPress={() => setStatus('已触发：删除产品审查')}
									size='sm'
									type='button'
									variant='ghost'
								>
									<Trash2Icon aria-hidden className='size-4' />
								</Button>
							</ListView.ItemAction>
						) : null}
					</ListView.Item>
				)}
			</ListView>
			<p className='mt-3 text-sm text-muted' role='status'>
				{status}
			</p>
		</div>
	)
}

function TablePreview() {
	return (
		<div className='w-full max-w-4xl'>
			<h3 className='text-base font-semibold'>Table</h3>
			<p className='mt-1 text-sm text-muted'>只保留产品当前需要的扫描、单选与水平溢出证据。</p>
			<Table className='mt-4' variant='secondary'>
				<Table.ScrollContainer>
					<Table.Content
						aria-label='任务摘要表格'
						className='min-w-[560px]'
						defaultSelectedKeys={['review']}
						selectionMode='single'
					>
						<Table.Header>
							<Table.Column isRowHeader>任务</Table.Column>
							<Table.Column>状态</Table.Column>
							<Table.Column>负责人</Table.Column>
						</Table.Header>
						<Table.Body>
							<Table.Row id='inbox'>
								<Table.Cell>整理收件箱</Table.Cell>
								<Table.Cell>待处理</Table.Cell>
								<Table.Cell>石头鱼</Table.Cell>
							</Table.Row>
							<Table.Row id='review'>
								<Table.Cell>{LONG_TITLE}</Table.Cell>
								<Table.Cell>进行中</Table.Cell>
								<Table.Cell>—（空值）</Table.Cell>
							</Table.Row>
							<Table.Row id='done'>
								<Table.Cell>发布候选检查</Table.Cell>
								<Table.Cell>已完成</Table.Cell>
								<Table.Cell>StoneFlow</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Content>
				</Table.ScrollContainer>
			</Table>
		</div>
	)
}

function TagPreview() {
	const [tags, setTags] = useState([
		{ id: 'selected', label: '已选中' },
		{ id: 'long', label: '需要确认跨窗口同步失败后的恢复路径' },
		{ id: 'empty', label: '—（空值）' },
		{ id: 'locked', label: '不可移除' },
	])

	return (
		<div className='w-full max-w-2xl'>
			<h3 className='text-base font-semibold'>Tag</h3>
			<TagGroup
				className='mt-4'
				defaultSelectedKeys={['selected']}
				disabledKeys={['locked']}
				onRemove={(keys) => setTags((items) => items.filter((item) => !keys.has(item.id)))}
				selectionMode='multiple'
			>
				<Label>任务标签</Label>
				<TagGroup.List items={tags}>
					{(tag) => (
						<Tag id={tag.id} textValue={tag.label}>
							{tag.label}
						</Tag>
					)}
				</TagGroup.List>
				<Description>标签可选择；除“不可移除”外均使用真实移除按钮。</Description>
			</TagGroup>
		</div>
	)
}

function ChipPreview() {
	return (
		<div className='w-full max-w-2xl'>
			<h3 className='text-base font-semibold'>Chip</h3>
			<div className='mt-4 flex min-w-0 flex-wrap items-center gap-3'>
				<Chip size='sm' variant='secondary'>
					<Chip.Label>待处理</Chip.Label>
				</Chip>
				<Chip color='accent' size='sm' variant='soft'>
					<Chip.Label>已选中</Chip.Label>
				</Chip>
				<Chip size='sm' variant='tertiary'>
					<Chip.Label>{LONG_TITLE}</Chip.Label>
				</Chip>
				<Chip size='sm' variant='tertiary'>
					<Chip.Label>—（空值）</Chip.Label>
				</Chip>
			</div>
		</div>
	)
}

function BadgePreview() {
	return (
		<div className='w-full max-w-xl'>
			<h3 className='text-base font-semibold'>Badge</h3>
			<div className='mt-4 flex flex-wrap items-center gap-8'>
				<Badge.Anchor>
					<Avatar aria-label='StoneFlow'>
						<Avatar.Fallback>SF</Avatar.Fallback>
					</Avatar>
					<Badge color='accent'>3</Badge>
				</Badge.Anchor>
				<Badge.Anchor>
					<Avatar aria-label='长中文负责人'>
						<Avatar.Fallback>长</Avatar.Fallback>
					</Avatar>
					<Badge color='warning' variant='soft'>
						99+
					</Badge>
				</Badge.Anchor>
				<Badge.Anchor>
					<Avatar aria-label='在线成员'>
						<Avatar.Fallback>空</Avatar.Fallback>
					</Avatar>
					<Badge color='success' aria-label='在线' />
				</Badge.Anchor>
				<span className='text-sm text-muted'>在线状态点</span>
			</div>
		</div>
	)
}

function AvatarPreview() {
	return (
		<div className='w-full max-w-xl'>
			<h3 className='text-base font-semibold'>Avatar</h3>
			<div className='mt-4 flex flex-wrap items-end gap-5'>
				<Avatar aria-label='石头鱼' size='sm'>
					<Avatar.Fallback>石</Avatar.Fallback>
				</Avatar>
				<Avatar aria-label='StoneFlow' color='accent'>
					<Avatar.Fallback>SF</Avatar.Fallback>
				</Avatar>
				<Avatar aria-label='协作者' color='warning' size='lg' variant='soft'>
					<Avatar.Fallback>协</Avatar.Fallback>
				</Avatar>
				<Avatar aria-label='未知成员'>
					<Avatar.Fallback>?</Avatar.Fallback>
				</Avatar>
			</div>
			<p className='mt-3 text-sm text-muted'>图片缺失时只验证本地 fallback，不依赖远程头像。</p>
		</div>
	)
}

function TaskRowFixture({
	defaultSelected = false,
	title = LONG_TITLE,
}: {
	defaultSelected?: boolean
	title?: string
}) {
	const [selected, setSelected] = useState(defaultSelected)
	const [status, setStatus] = useState('待处理')

	return (
		<RowShell selected={selected}>
			<Checkbox aria-label={`选择任务：${title}`} isSelected={selected} onChange={setSelected}>
				<Checkbox.Content>
					<Checkbox.Control>
						<Checkbox.Indicator />
					</Checkbox.Control>
				</Checkbox.Content>
			</Checkbox>
			<span className='min-w-0 flex-1 truncate font-medium' title={title}>
				{title}
			</span>
			<span className='hidden shrink-0 items-center gap-2 @min-[560px]/task-list:flex'>
				<Chip size='sm' variant='tertiary'>
					<Chip.Label>{status}</Chip.Label>
				</Chip>
				<span className='flex items-center gap-1 text-xs text-muted'>
					<CalendarDaysIcon aria-hidden className='size-4' />8 月 30 日
				</span>
			</span>
			<Button
				aria-label={`切换状态：${title}`}
				isIconOnly
				onPress={() => setStatus((value) => (value === '待处理' ? '已完成' : '待处理'))}
				size='sm'
				type='button'
				variant='ghost'
			>
				<CheckCircle2Icon aria-hidden className='size-4' />
			</Button>
		</RowShell>
	)
}

function TaskRowPreview() {
	return (
		<div className='@container/task-list w-full max-w-4xl'>
			<h3 className='text-base font-semibold'>Task Row</h3>
			<div className='mt-4 overflow-hidden rounded-lg border border-surface'>
				<TaskRowFixture defaultSelected />
				<TaskRowFixture title='简短任务标题' />
			</div>
			<p className='mt-3 text-sm text-muted'>本地状态只用于观察选择与尾部动作，不写入任务数据。</p>
		</div>
	)
}

function TaskGroupFixture({
	children,
	label = '进行中',
	count = 2,
}: {
	children: ReactNode
	label?: string
	count?: number
}) {
	const [expanded, setExpanded] = useState(true)
	const contentId = useId()

	return (
		<>
			<div className='bg-surface-secondary p-1'>
				<Button
					aria-controls={contentId}
					aria-expanded={expanded}
					fullWidth
					onPress={() => setExpanded((value) => !value)}
					type='button'
					variant='ghost'
				>
					<span className='flex min-w-0 flex-1 items-center justify-between gap-3'>
						<span className='truncate font-medium'>{label}</span>
						<span className='flex shrink-0 items-center gap-2'>
							<Chip size='sm' variant='tertiary'>
								<Chip.Label>{count}</Chip.Label>
							</Chip>
							<span className='text-xs text-muted'>{expanded ? '已展开' : '已折叠'}</span>
						</span>
					</span>
				</Button>
			</div>
			<div hidden={!expanded} id={contentId}>
				{children}
			</div>
		</>
	)
}

function GroupHeaderPreview() {
	return (
		<div className='w-full max-w-3xl'>
			<h3 className='text-base font-semibold'>Group Header</h3>
			<div className='mt-4 overflow-hidden rounded-lg border border-surface'>
				<TaskGroupFixture label='进行中 · 需要跨团队确认的长中文分组标题' count={12}>
					<RowShell>
						<span className='truncate'>分组内第一条任务</span>
					</RowShell>
				</TaskGroupFixture>
			</div>
		</div>
	)
}

function BoardFixture({ label, narrow = false }: { label: string; narrow?: boolean }) {
	return (
		<section
			aria-label={label}
			className={`@container/task-list ${narrow ? 'w-[520px] max-w-full' : 'w-full'}`}
		>
			<h4 className='mb-2 text-sm font-medium'>{label}</h4>
			<div className='overflow-hidden rounded-lg border border-surface bg-background'>
				<TaskGroupFixture>
					<TaskRowFixture defaultSelected title='审查当前组件的键盘焦点与尾部动作' />
					<TaskRowFixture />
				</TaskGroupFixture>
			</div>
		</section>
	)
}

function TaskBoardPreview() {
	return (
		<div className='flex w-full max-w-5xl flex-col gap-6' data-ui-lab-preview-root='task-board'>
			<h3 className='text-base font-semibold'>Task Board</h3>
			<BoardFixture label='宽容器 · 560px 及以上' />
			<BoardFixture label='紧凑容器 · 520px' narrow />
			<div className='rounded-lg border border-surface bg-surface-secondary p-4 text-sm leading-6'>
				<p className='font-medium'>仅真实应用验证</p>
				<p className='mt-1 text-muted'>
					虚拟滚动、sticky 分组、Store、Query、批量选择、WebView 与 Tauri Command 仍在 Main
					中验证；Lab 不复制生产 TaskBoard JSX 或运行时。
				</p>
			</div>
		</div>
	)
}

export const TICKET_05_SAMPLES = [
	{
		id: 'stoneflow-row-shell',
		name: 'RowShell',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查共享 RowShell 的普通、选中、尾部动作、禁用与长文本状态。',
		keywords: ['row', 'row shell', '行', '尾部操作', 'keyboard'],
		owner: '共享 RowShell',
		source: 'src/shared/components/row/RowShell.tsx',
		coverage: 'rendered',
		states: 'Rest、Selected、Trailing Action、Disabled、长中文、Keyboard Focus Visible',
		verification: 'Lab 可验证；业务命令仅真实应用验证',
		Preview: RowShellPreview,
	},
	{
		id: 'stoneflow-menu',
		name: 'Menu',
		view: 'stoneflow',
		category: 'Collections',
		description: '用真实 Dropdown Menu 检查选择、禁用、长文本与键盘路径。',
		keywords: ['menu', 'dropdown', '菜单', 'disabled', 'keyboard'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Selected、Disabled、长中文、Escape、Focus Restore',
		verification: 'Lab 可验证上游交互；产品命令仅真实应用验证',
		Preview: MenuPreview,
	},
	{
		id: 'stoneflow-list-box',
		name: 'ListBox',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查真实单选 ListBox 的普通、选中、禁用与长中文选项。',
		keywords: ['listbox', 'list box', '列表框', 'selected', 'disabled'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Rest、Selected、Disabled、长中文、Keyboard Focus Visible',
		verification: 'Lab 可验证',
		Preview: ListBoxPreview,
	},
	{
		id: 'stoneflow-list-view',
		name: 'ListView',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查真实 ListView 的单选、尾部操作、禁用与截断行为。',
		keywords: ['listview', 'list view', '列表', 'item action', '尾部操作'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Rest、Selected、Trailing Action、Disabled、长中文、Keyboard Focus Visible',
		verification: 'Lab 可验证；Global Search 小屏尾部动作仍在真实应用验证',
		Preview: ListViewPreview,
	},
	{
		id: 'stoneflow-table',
		name: 'Table',
		view: 'stoneflow',
		category: 'Collections',
		description: '以最小任务摘要表检查行选择、长中文、空值与水平溢出。',
		keywords: ['table', '表格', 'selected', 'overflow', '空值'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Rest、Selected、长中文、空值、Overflow',
		verification: 'Lab 可验证；不新增排序、分页或数据表平台',
		Preview: TablePreview,
	},
	{
		id: 'stoneflow-tag',
		name: 'Tag',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查真实 TagGroup 的选中、禁用、可移除、长中文与空值。',
		keywords: ['tag', '标签', 'remove', 'selected', '空值'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Rest、Selected、Disabled、Removable、长中文、空值',
		verification: 'Lab 可验证；移除仅影响当前 fixture',
		Preview: TagPreview,
	},
	{
		id: 'stoneflow-chip',
		name: 'Chip',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查紧凑状态 Chip 的短值、选中语气、长中文与空值。',
		keywords: ['chip', '状态', '长中文', '空值', 'selected'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Short、Selected Tone、长中文、空值、Wrap',
		verification: 'Lab 可验证；Chip 不承担无产品需求的移除交互',
		Preview: ChipPreview,
	},
	{
		id: 'stoneflow-badge',
		name: 'Badge',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查 Badge 的短数字、99+、无文本状态点与 Avatar 锚定。',
		keywords: ['badge', '徽标', '99+', 'dot', '空值'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Short、Overflow Count、Dot、Accent、Warning、Success',
		verification: 'Lab 可验证',
		Preview: BadgePreview,
	},
	{
		id: 'stoneflow-avatar',
		name: 'Avatar',
		view: 'stoneflow',
		category: 'Collections',
		description: '不依赖网络地检查 Avatar 尺寸、颜色与缺图 fallback。',
		keywords: ['avatar', '头像', 'fallback', 'empty', 'size'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Small、Medium、Large、Soft、Fallback、Empty',
		verification: 'Lab 可验证 fallback；真实头像加载与缓存仅真实应用验证',
		Preview: AvatarPreview,
	},
	{
		id: 'stoneflow-task-row',
		name: 'Task Row',
		view: 'stoneflow',
		category: 'Collections',
		description: '用最小可信任务数据检查选择、状态、日期、尾部动作与扫描密度。',
		keywords: ['task row', '任务行', 'selection', 'metadata', '尾部操作'],
		owner: 'UI Lab fixture',
		source:
			'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx；src/shared/components/row/RowShell.tsx',
		coverage: 'rendered',
		states: 'Rest、Selected、长中文、Metadata、Trailing Action、Keyboard Focus Visible',
		verification: 'Lab 可验证组合；Store、Query、写入与业务命令仅真实应用验证',
		Preview: TaskRowPreview,
	},
	{
		id: 'stoneflow-group-header',
		name: 'Group Header',
		view: 'stoneflow',
		category: 'Collections',
		description: '用可折叠的最小分组头检查计数、长中文与紧凑扫描密度。',
		keywords: ['group header', '分组头', 'collapse', 'count', '长中文'],
		owner: 'UI Lab fixture',
		source: 'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		states: 'Expanded、Collapsed、Count、长中文、Keyboard Focus Visible',
		verification: 'Lab 可验证；真实 sticky 与分组模型仅真实应用验证',
		Preview: GroupHeaderPreview,
	},
	{
		id: 'stoneflow-task-board',
		name: 'Task Board',
		view: 'stoneflow',
		category: 'Collections',
		description: '并排登记宽容器与 520px 紧凑容器，观察既有 560px 元数据收敛规则。',
		keywords: ['task board', '任务面板', '560px', '520px', 'compact', '窄容器'],
		owner: 'UI Lab fixture',
		source:
			'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx；src/features/task/components/TaskBoard.tsx',
		coverage: 'rendered',
		states: 'Wide、<560 Compact、Selected、长中文、Overflow、Trailing Action',
		verification: 'Lab 可验证布局证据；虚拟滚动、Store、Query、Tauri 与写入仅真实应用验证',
		Preview: TaskBoardPreview,
	},
] as const satisfies readonly UiLabSample[]
