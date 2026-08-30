import { useCallback, useId, useRef, useState, type ReactNode } from 'react'

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
	SearchField,
	Separator,
	Table,
	type Selection,
} from '@heroui/react'
import { checkboxVariants } from '@heroui/styles'
import {
	ArchiveIcon,
	BellIcon,
	CalendarDaysIcon,
	CheckIcon,
	CheckCircle2Icon,
	CircleIcon,
	CopyIcon,
	EllipsisIcon,
	FolderIcon,
	InboxIcon,
	PinIcon,
	PlusIcon,
	TriangleIcon,
	Trash2Icon,
} from 'lucide-react'

import { RowShell, type RowSelectionGroupPosition } from '@/shared/components/row'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'

const LONG_TITLE = '把跨窗口同步失败后的恢复路径整理成一条可复现、可验证且能长期维护的规则'

function RowShellPreview() {
	const [selected, setSelected] = useState('selected')
	const [focused, setFocused] = useState('normal')
	const [status, setStatus] = useState('当前行：选中事项')
	const listRef = useRef<HTMLDivElement>(null)
	const rows = [
		{ id: 'normal', title: '普通事项' },
		{ id: 'selected', title: '选中事项' },
		{ id: 'active', title: '已打开事项（Active 持久态）', active: true },
		{ id: 'action', title: '含尾部操作', hasAction: true },
		{ id: 'pending', title: '更新中的事项', pending: true },
		{ id: 'long', title: LONG_TITLE },
	]
	const activateRow = (id: string, title: string) => {
		setSelected(id)
		setStatus(`当前行：${title}`)
	}
	const focusRowAt = (index: number) => {
		const row = rows[index]
		const target = listRef.current?.children.item(index)
		if (!row || !(target instanceof HTMLElement)) return
		setFocused(row.id)
		setStatus(`键盘焦点：${row.title}`)
		target.focus()
	}

	return (
		<div className='w-full max-w-3xl' data-ui-lab-row-shell>
			<h3 className='text-base font-semibold'>RowShell</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				尾部 Ghost Button 保持独立；上下键移动焦点，Active 表示已打开的持久态，不是 Hover。
			</p>
			<div
				ref={listRef}
				aria-label='RowShell 状态'
				className='mt-4 overflow-hidden rounded-lg border border-surface'
				role='grid'
			>
				{rows.map((row) => (
					<RowShell
						key={row.id}
						active={row.active}
						aria-current={row.active ? 'true' : undefined}
						aria-label={row.title}
						aria-selected={selected === row.id}
						interactive
						pending={row.pending}
						role='row'
						selected={selected === row.id}
						selectionGroupPosition={selected === row.id ? 'single' : undefined}
						tabIndex={focused === row.id ? 0 : -1}
						onClick={(event) => {
							if ((event.target as HTMLElement).closest('button')) return
							setFocused(row.id)
							activateRow(row.id, row.title)
						}}
						onFocus={() => setFocused(row.id)}
						onKeyDown={(event) => {
							if (event.target !== event.currentTarget) return
							const currentIndex = rows.findIndex((item) => item.id === row.id)
							const nextIndex =
								event.key === 'Home'
									? 0
									: event.key === 'End'
										? rows.length - 1
										: event.key === 'ArrowDown'
											? Math.min(currentIndex + 1, rows.length - 1)
											: event.key === 'ArrowUp'
												? Math.max(currentIndex - 1, 0)
												: null
							if (nextIndex !== null) {
								event.preventDefault()
								focusRowAt(nextIndex)
								return
							}
							if (!['Enter', ' '].includes(event.key)) return
							event.preventDefault()
							activateRow(row.id, row.title)
						}}
					>
						<div className='flex min-w-0 flex-1 items-center' role='gridcell'>
							<span className='min-w-0 flex-1 truncate' title={row.title}>
								{row.title}
							</span>
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
						</div>
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
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [status, setStatus] = useState('尚未执行菜单操作')
	const items = [
		{ id: '打开任务', label: '打开任务', icon: CheckCircle2Icon, shortcut: 'enter' },
		{ id: '固定任务', label: '固定任务', icon: PinIcon, shortcut: 'P', checked: true },
		{ id: '复制任务', label: '复制任务', icon: CopyIcon, shortcut: 'D' },
		{ id: '归档任务', label: '归档任务', icon: ArchiveIcon, shortcut: 'A' },
		{ id: '移到回收站', label: '移到回收站', icon: Trash2Icon, shortcut: 'delete', danger: true },
	]
	const normalizedQuery = query.trim().toLowerCase()
	const visibleItems = items.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
	const regularItems = visibleItems.filter((item) => !item.danger)
	const dangerItems = visibleItems.filter((item) => item.danger)
	const renderItem = (item: (typeof items)[number]) => {
		const Icon = item.icon

		return (
			<Dropdown.Item
				id={item.id}
				key={item.id}
				textValue={item.label}
				variant={item.danger ? 'danger' : undefined}
			>
				<Icon aria-hidden className='size-4 shrink-0' />
				<span className='min-w-0 flex-1 truncate'>{item.label}</span>
				<span className='ml-auto grid shrink-0 grid-cols-[0.875rem_1.75rem] items-center gap-2 text-muted'>
					<span className='flex justify-center'>
						<CheckIcon aria-hidden className={`size-3.5 ${item.checked ? '' : 'invisible'}`} />
					</span>
					<Kbd aria-hidden className='justify-center' variant='light'>
						{item.shortcut === 'enter' || item.shortcut === 'delete' ? (
							<Kbd.Abbr keyValue={item.shortcut} />
						) : (
							<Kbd.Content>{item.shortcut}</Kbd.Content>
						)}
					</Kbd>
				</span>
			</Dropdown.Item>
		)
	}

	return (
		<div className='flex w-full max-w-lg flex-col items-start gap-4' data-ui-lab-menu>
			<h3 className='text-base font-semibold'>Menu</h3>
			<Dropdown
				isOpen={open}
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen)
					if (!nextOpen) setQuery('')
				}}
			>
				<Button type='button' variant='ghost'>
					操作菜单
					<EllipsisIcon aria-hidden className='size-4' />
				</Button>
				<Dropdown.Popover className='w-72'>
					<div className='border-b border-separator px-2 py-1.5'>
						<SearchField
							aria-label='搜索任务操作'
							fullWidth
							onChange={setQuery}
							value={query}
							variant='secondary'
						>
							<SearchField.Group className='ui-lab-menu-search'>
								<SearchField.SearchIcon />
								<SearchField.Input
									onKeyDown={(event) => {
										if (event.key === 'Escape') {
											event.preventDefault()
											setOpen(false)
											return
										}
										event.stopPropagation()
									}}
									placeholder='搜索操作…'
								/>
								<SearchField.ClearButton aria-label='清空任务操作搜索' />
								<Kbd aria-hidden className='mr-1 shrink-0' variant='light'>
									<Kbd.Content>M</Kbd.Content>
								</Kbd>
							</SearchField.Group>
						</SearchField>
					</div>
					<Dropdown.Menu
						aria-label='任务操作菜单'
						onAction={(key) => setStatus(`已执行：${String(key)}`)}
					>
						<Dropdown.Section>{regularItems.map(renderItem)}</Dropdown.Section>
						<Dropdown.Section>{dangerItems.map(renderItem)}</Dropdown.Section>
						{visibleItems.length === 0 ? (
							<Dropdown.Item id='empty' isDisabled textValue='没有匹配的操作'>
								没有匹配的操作
							</Dropdown.Item>
						) : null}
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
			<p className='mt-1 text-sm leading-6 text-muted'>
				用于从固定可见的一组选项中选择，也是 Select / ComboBox 的选项语义；不承载富搜索结果行。
			</p>
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
						<div className='flex min-w-0 flex-col gap-1'>
							<Label>产品审查</Label>
							<Description>当前选中项</Description>
						</div>
						<ListBox.ItemIndicator />
					</ListBox.Item>
					<ListBox.Item id={LONG_TITLE} textValue={LONG_TITLE}>
						<CircleIcon aria-hidden className='size-4 text-muted' />
						<div className='flex min-w-0 flex-col gap-1'>
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
	const [lastOpened, setLastOpened] = useState('尚未打开结果')
	const items = [
		{ id: 'inbox', title: '收件箱', description: '任务', time: '刚刚' },
		{ id: 'review', title: '产品审查', description: '项目', time: '今天' },
		{ id: 'long', title: LONG_TITLE, description: '任务', time: '明天' },
		{ id: 'archive', title: '长期归档', description: '不可用', time: '8 月 30 日' },
	]

	return (
		<div className='w-full max-w-2xl' data-ui-lab-list-view>
			<h3 className='text-base font-semibold'>ListView</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				用于浏览并执行一组富内容行；搜索结果只执行跳转，因此使用 none，而不是选择态。
			</p>
			<ListView
				aria-label='工作区列表'
				disabledKeys={['archive']}
				items={items}
				onAction={(key) => setLastOpened(String(key))}
				selectionMode='none'
				variant='primary'
			>
				{(item) => (
					<ListView.Item id={item.id} textValue={item.title}>
						<ListView.ItemContent>
							<FolderIcon aria-hidden className='size-4 text-muted' />
							<div className='flex min-w-0 flex-col gap-1'>
								<ListView.Title>{item.title}</ListView.Title>
								<ListView.Description>{item.description}</ListView.Description>
							</div>
						</ListView.ItemContent>
						<ListView.ItemAction>
							<time className='whitespace-nowrap text-xs text-muted'>{item.time}</time>
						</ListView.ItemAction>
					</ListView.Item>
				)}
			</ListView>
			<p className='mt-3 text-sm text-muted' role='status'>
				最近打开：{lastOpened}
			</p>
		</div>
	)
}

function TablePreview() {
	return (
		<div className='w-full max-w-4xl'>
			<h3 className='text-base font-semibold'>Table</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				当前没有生产消费者；仅保留 HeroUI 能力对照，不进入本轮产品改造。
			</p>
			<Table className='mt-4' variant='secondary'>
				<Table.ScrollContainer>
					<Table.Content
						aria-label='任务摘要表格'
						className='min-w-140'
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

const LABEL_OPTIONS = [
	{ id: 'bug', label: 'Bug', color: '#f2555a' },
	{ id: '123', label: '123', color: '#48b782' },
	{ id: 'feature', label: 'Feature', color: '#a879f7' },
	{ id: 'improvement', label: 'Improvement', color: '#4c9ff8' },
] as const

const labelCheckboxStyles = checkboxVariants({ variant: 'primary' })

export function LabelsPreview() {
	const labelsAnchorRef = useRef<HTMLDivElement>(null)
	const keepOpenAfterSelectionRef = useRef(false)
	const pendingSelectedLabelIdsRef = useRef<string[] | null>(null)
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(['bug', '123'])
	const handlePopoverRef = useCallback((element: HTMLDivElement | null) => {
		if (element) return
		const pendingSelectedLabelIds = pendingSelectedLabelIdsRef.current
		pendingSelectedLabelIdsRef.current = null
		if (pendingSelectedLabelIds) setSelectedLabelIds(pendingSelectedLabelIds)
		setQuery('')
	}, [])
	const normalizedQuery = query.trim().toLocaleLowerCase()
	const selectedIds = new Set(selectedLabelIds)
	const selectedOptions = LABEL_OPTIONS.filter((option) => selectedIds.has(option.id))
	const matchesQuery = (option: (typeof LABEL_OPTIONS)[number]) =>
		option.label.toLocaleLowerCase().includes(normalizedQuery)
	const visibleSelectedOptions = selectedOptions.filter(matchesQuery)
	const visibleAvailableOptions = LABEL_OPTIONS.filter(
		(option) => !selectedIds.has(option.id) && matchesQuery(option),
	)
	const handleSelectionChange = (selection: Selection) => {
		const nextSelectedIds =
			selection === 'all'
				? LABEL_OPTIONS.map((option) => option.id)
				: LABEL_OPTIONS.filter((option) => selection.has(option.id)).map((option) => option.id)
		if (keepOpenAfterSelectionRef.current) setSelectedLabelIds(nextSelectedIds)
		else pendingSelectedLabelIdsRef.current = nextSelectedIds
	}
	const renderOption = (option: (typeof LABEL_OPTIONS)[number]) => (
		<Dropdown.Item
			id={option.id}
			key={option.id}
			onAction={() => {
				if (!keepOpenAfterSelectionRef.current) setOpen(false)
				keepOpenAfterSelectionRef.current = false
			}}
			onPointerCancel={() => {
				keepOpenAfterSelectionRef.current = false
			}}
			onPointerDown={(event) => {
				keepOpenAfterSelectionRef.current =
					event.target instanceof Element && event.target.closest('[data-slot="checkbox"]') !== null
			}}
			textValue={option.label}
		>
			{({ isSelected }) => (
				<span className='flex min-w-0 flex-1 items-center gap-2'>
					<span
						className={labelCheckboxStyles.base()}
						data-selected={isSelected || undefined}
						data-slot='checkbox'
					>
						<span className={labelCheckboxStyles.control()} data-slot='checkbox-control'>
							<span className={labelCheckboxStyles.indicator()} data-slot='checkbox-indicator'>
								<svg
									aria-hidden='true'
									data-slot='checkbox-default-indicator--checkmark'
									fill='none'
									role='presentation'
									stroke='currentColor'
									strokeDasharray={22}
									strokeDashoffset={isSelected ? 44 : 66}
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									viewBox='0 0 17 18'
								>
									<polyline points='1 9 7 14 15 4' />
								</svg>
							</span>
						</span>
					</span>
					<span
						aria-hidden
						className='size-2.5 shrink-0 rounded-full'
						style={{ backgroundColor: option.color }}
					/>
					<span className='min-w-0 flex-1 truncate'>{option.label}</span>
				</span>
			)}
		</Dropdown.Item>
	)

	return (
		<div className='w-full max-w-2xl'>
			<h3 className='text-base font-semibold'>Labels</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				产品概念是任务标签，不直接暴露通用 TagGroup；已选标签常驻，统一从下拉菜单增删。
			</p>
			<div
				ref={labelsAnchorRef}
				className='mt-4 flex w-fit max-w-full min-w-0 flex-wrap items-center gap-2'
			>
				{selectedOptions.map((option) => (
					<Chip key={option.id} size='lg' variant='secondary'>
						<span
							aria-hidden
							className='size-2.5 shrink-0 rounded-full'
							style={{ backgroundColor: option.color }}
						/>
						<Chip.Label>{option.label}</Chip.Label>
					</Chip>
				))}
				{selectedOptions.length === 0 ? <span className='text-sm text-muted'>暂无标签</span> : null}
				<Dropdown isOpen={open} onOpenChange={setOpen}>
					<Button aria-label='编辑任务标签' isIconOnly size='sm' type='button' variant='ghost'>
						<PlusIcon aria-hidden className='size-4' />
					</Button>
					<Dropdown.Popover
						ref={handlePopoverRef}
						className='w-64'
						placement='bottom end'
						triggerRef={labelsAnchorRef}
					>
						<div className='border-b border-separator px-2 py-1.5'>
							<SearchField
								aria-label='搜索任务标签'
								fullWidth
								onChange={setQuery}
								value={query}
								variant='secondary'
							>
								<SearchField.Group className='ui-lab-menu-search'>
									<SearchField.SearchIcon />
									<SearchField.Input
										className='min-w-0'
										onKeyDown={(event) => {
											if (event.key === 'Escape') {
												event.preventDefault()
												setOpen(false)
												return
											}
											event.stopPropagation()
										}}
										placeholder='更改或添加标签…'
									/>
									<SearchField.ClearButton aria-label='清空标签搜索' />
									<Kbd aria-hidden className='mr-1 shrink-0' variant='light'>
										<Kbd.Content>L</Kbd.Content>
									</Kbd>
								</SearchField.Group>
							</SearchField>
						</div>
						<Dropdown.Menu
							aria-label='任务标签'
							selectedKeys={selectedIds}
							selectionMode='multiple'
							shouldCloseOnSelect={false}
							onSelectionChange={handleSelectionChange}
						>
							{visibleSelectedOptions.length > 0 ? (
								<Dropdown.Section aria-label='已选择'>
									{visibleSelectedOptions.map(renderOption)}
								</Dropdown.Section>
							) : null}
							{visibleSelectedOptions.length > 0 && visibleAvailableOptions.length > 0 ? (
								<Separator />
							) : null}
							{visibleAvailableOptions.length > 0 ? (
								<Dropdown.Section aria-label='可添加'>
									{visibleAvailableOptions.map(renderOption)}
								</Dropdown.Section>
							) : null}
							{visibleSelectedOptions.length === 0 && visibleAvailableOptions.length === 0 ? (
								<Dropdown.Item id='empty' isDisabled textValue='没有匹配的标签'>
									没有匹配的标签
								</Dropdown.Item>
							) : null}
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			</div>
			<span className='sr-only' role='status'>
				已选择标签：{selectedOptions.map((option) => option.label).join('、') || '无'}
			</span>
		</div>
	)
}

function ChipPreview() {
	return (
		<div className='w-full max-w-2xl'>
			<h3 className='text-base font-semibold'>Chip</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				生产当前用于只读元数据、语义状态和紧凑计数；不是另一种 Button。
			</p>
			<div className='mt-4 flex min-w-0 flex-wrap items-start gap-4'>
				<div className='flex flex-col items-start gap-2'>
					<span className='text-xs text-muted'>只读元数据</span>
					<Chip size='lg' variant='secondary'>
						<FolderIcon aria-hidden className='size-3.5' />
						<Chip.Label>V1.0 收尾</Chip.Label>
					</Chip>
				</div>
				<div className='flex flex-col items-start gap-2'>
					<span className='text-xs text-muted'>语义状态</span>
					<Chip color='warning' size='lg' variant='soft'>
						<Chip.Label>同步待重试</Chip.Label>
					</Chip>
				</div>
				<div className='flex flex-col items-start gap-2'>
					<span className='text-xs text-muted'>紧凑计数</span>
					<Chip size='lg' variant='tertiary'>
						<Chip.Label>12</Chip.Label>
					</Chip>
				</div>
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
					<Button aria-label='通知' isIconOnly size='md' type='button' variant='secondary'>
						<BellIcon aria-hidden className='size-4' />
					</Button>
					<Badge color='accent' size='sm'>
						3
					</Badge>
				</Badge.Anchor>
				<Badge.Anchor>
					<Button aria-label='收件箱' isIconOnly size='md' type='button' variant='secondary'>
						<InboxIcon aria-hidden className='size-4' />
					</Button>
					<Badge color='warning' size='sm' variant='soft'>
						99+
					</Badge>
				</Badge.Anchor>
			</div>
			<p className='mt-3 text-sm text-muted'>统一使用 Small；只保留当前有明确语义的通知计数。</p>
		</div>
	)
}

function AvatarPreview() {
	return (
		<div className='w-full max-w-xl'>
			<h3 className='text-base font-semibold'>Avatar</h3>
			<div className='mt-4 flex flex-wrap items-start gap-6'>
				<div className='flex flex-col items-center gap-2'>
					<Avatar size='md'>
						<Avatar.Image alt='石头鱼' src='/avatar.jpg' />
						<Avatar.Fallback>石</Avatar.Fallback>
					</Avatar>
					<span className='text-xs text-muted'>真实图片</span>
				</div>
				<div className='flex flex-col items-center gap-2'>
					<Avatar size='md'>
						<Avatar.Fallback>SF</Avatar.Fallback>
					</Avatar>
					<span className='text-xs text-muted'>无图片 fallback</span>
				</div>
			</div>
			<p className='mt-3 text-sm text-muted'>Lab 目标改为 Medium；不展示无消费者的彩色尺寸矩阵。</p>
		</div>
	)
}

function TaskRowFixture({
	selected,
	selectionGroupPosition,
	title,
	onSelectedChange,
}: {
	selected: boolean
	selectionGroupPosition?: RowSelectionGroupPosition
	title: string
	onSelectedChange: (selected: boolean) => void
}) {
	const [status, setStatus] = useState('待处理')

	return (
		<RowShell selected={selected} selectionGroupPosition={selectionGroupPosition}>
			<span
				className={`flex size-5 shrink-0 items-center justify-center ${
					selected
						? 'opacity-100'
						: 'opacity-0 group-has-focus-visible/row-shell:opacity-100 group-hover/row-shell:opacity-100'
				}`}
				data-slot='row-selection-cell'
			>
				<Checkbox
					aria-label={`选择任务：${title}`}
					isSelected={selected}
					onChange={onSelectedChange}
				>
					<Checkbox.Content>
						<Checkbox.Control>
							<Checkbox.Indicator />
						</Checkbox.Control>
					</Checkbox.Content>
				</Checkbox>
			</span>
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

function TaskRowsFixture({
	items,
	defaultSelectedIds = [],
}: {
	items: ReadonlyArray<{ id: string; title: string }>
	defaultSelectedIds?: readonly string[]
}) {
	const [selectedIds, setSelectedIds] = useState(() => new Set(defaultSelectedIds))

	return items.map((item, index) => {
		const selected = selectedIds.has(item.id)
		const joinsPrevious = index > 0 && selectedIds.has(items[index - 1]!.id)
		const joinsNext = index < items.length - 1 && selectedIds.has(items[index + 1]!.id)
		let selectionGroupPosition: RowSelectionGroupPosition | undefined
		if (selected) {
			if (joinsPrevious) selectionGroupPosition = joinsNext ? 'middle' : 'last'
			else selectionGroupPosition = joinsNext ? 'first' : 'single'
		}

		return (
			<TaskRowFixture
				key={item.id}
				selected={selected}
				selectionGroupPosition={selectionGroupPosition}
				title={item.title}
				onSelectedChange={(nextSelected) =>
					setSelectedIds((current) => {
						const next = new Set(current)
						if (nextSelected) next.add(item.id)
						else next.delete(item.id)
						return next
					})
				}
			/>
		)
	})
}

export function TaskRowPreview() {
	return (
		<div className='@container/task-list w-full max-w-4xl' data-ui-lab-task-rows>
			<h3 className='text-base font-semibold'>Task Row</h3>
			<div className='mt-4 overflow-hidden rounded-lg border border-surface'>
				<TaskRowsFixture
					defaultSelectedIds={['review', 'middle', 'short']}
					items={[
						{ id: 'review', title: LONG_TITLE },
						{ id: 'middle', title: '连续选中分组的中间任务' },
						{ id: 'short', title: '简短任务标题' },
						{ id: 'rest', title: '未选择任务，用于观察 Hover' },
					]}
				/>
			</div>
			<p className='mt-3 text-sm text-muted'>
				前三行默认连续选中，用于检查 first / middle / last；第四行用于检查 Row Hover 与 Checkbox
				显示。
			</p>
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
	const [status, setStatus] = useState('')
	const contentId = useId()
	const toggleExpanded = () => setExpanded((value) => !value)

	return (
		<div className='flex flex-col gap-0.5'>
			<div
				className='flex h-9 min-w-0 items-center gap-2 rounded-md pl-3 pr-1'
				data-ui-lab-group-header
				onDoubleClick={toggleExpanded}
			>
				<Button
					aria-controls={contentId}
					aria-expanded={expanded}
					aria-label={expanded ? `折叠 ${label}` : `展开 ${label}`}
					isIconOnly
					onDoubleClick={(event) => event.stopPropagation()}
					onPress={toggleExpanded}
					size='sm'
					type='button'
					variant='ghost'
				>
					<span className='inline-flex size-3 items-center justify-center'>
						<TriangleIcon
							aria-hidden
							className={`size-1.5 fill-current text-muted ${expanded ? 'rotate-180' : 'rotate-90'}`}
						/>
					</span>
				</Button>
				<div className='flex min-w-0 flex-1 items-center gap-2 px-1 text-xs font-semibold'>
					<CircleIcon aria-hidden className='size-4 shrink-0 text-warning' />
					<span className='min-w-0 truncate' title={label}>
						{label}
					</span>
					<span className='shrink-0 tabular-nums text-muted'>{count}</span>
				</div>
				<Button
					aria-label={`在 ${label} 中创建任务`}
					isIconOnly
					onDoubleClick={(event) => event.stopPropagation()}
					onPress={() => setStatus(`已触发：在 ${label} 中创建任务`)}
					size='sm'
					type='button'
					variant='ghost'
				>
					<PlusIcon aria-hidden className='size-4' />
				</Button>
			</div>
			<div hidden={!expanded} id={contentId}>
				{children}
			</div>
			<span className='sr-only' role='status'>
				{status}
			</span>
		</div>
	)
}

export function GroupHeaderPreview() {
	return (
		<div className='w-full max-w-3xl'>
			<h3 className='text-base font-semibold'>Group Header</h3>
			<p className='mt-1 text-sm leading-6 text-muted'>
				Lab 验证独立分组行、两个 Ghost Button、双击折叠与长标题；右键菜单和 sticky 留在真实应用。
			</p>
			<div className='mt-4'>
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
			className={`@container/task-list ${narrow ? 'w-130 max-w-full' : 'w-full'}`}
			data-ui-lab-task-rows
		>
			<h4 className='mb-2 text-sm font-medium'>{label}</h4>
			<div className='bg-background'>
				<TaskGroupFixture>
					<TaskRowsFixture
						defaultSelectedIds={['review']}
						items={[
							{ id: 'review', title: '审查当前组件的键盘焦点与尾部动作' },
							{ id: 'long', title: LONG_TITLE },
						]}
					/>
				</TaskGroupFixture>
			</div>
		</section>
	)
}

export function TaskBoardPreview() {
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
		description: '检查共享 RowShell 的整行状态与最小网格键盘导航；它不是 HeroUI 集合组件。',
		keywords: ['row', 'row shell', '行', '尾部操作', 'keyboard'],
		owner: '共享 RowShell',
		source: 'src/shared/components/row/RowShell.tsx',
		coverage: 'rendered',
		states:
			'Rest、Hover、Active、Selected、Pending、Trailing Action、长中文、Arrow / Home / End、Keyboard Focus Visible',
		verification: 'Lab 可验证；业务命令仅真实应用验证',
		Preview: RowShellPreview,
	},
	{
		id: 'stoneflow-menu',
		name: 'Menu',
		view: 'stoneflow',
		category: 'Collections',
		description: '用真实 Dropdown 组合检查搜索、固定右栏、勾选状态、快捷键、危险项与焦点恢复。',
		keywords: ['menu', 'dropdown', '菜单', 'search', 'danger', 'keyboard'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Search、Checked、Shortcut、Danger、Escape、Focus Restore',
		verification: 'Lab 可验证上游交互；产品命令仅真实应用验证',
		Preview: MenuPreview,
	},
	{
		id: 'stoneflow-list-box',
		name: 'ListBox',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查固定选项集合的单选、禁用、长中文与键盘路径，并明确它与富结果列表的边界。',
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
		description: '以搜索结果场景检查 ListView 的 none 模式、行操作、禁用、时间与截断行为。',
		keywords: ['listview', 'list view', '列表', 'item action', '尾部操作'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Rest、Hover、Action、Disabled、长中文、Time、Keyboard Focus Visible',
		verification: 'Lab 可验证结构与交互；真实搜索排序、路由与小屏布局仍在真实应用验证',
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
		name: 'Labels',
		view: 'stoneflow',
		category: 'Collections',
		description:
			'以任务标签场景检查 28px 已选标签与分组 Checkbox Dropdown；不把通用 TagGroup 当成产品模型。',
		keywords: ['tag', 'label', '标签', 'dropdown', 'checkbox', 'multiple'],
		owner: 'UI Lab fixture / HeroUI OSS',
		source: '@heroui/react@3.2.4；任务标签产品假设',
		coverage: 'rendered',
		states:
			'Closed、Open、Search、Selected Group、Available Group、Menuitem Checkbox、Empty Result',
		verification: 'Lab 可验证组合；生产标签模型、持久化与命令尚未实现',
		Preview: LabelsPreview,
	},
	{
		id: 'stoneflow-chip',
		name: 'Chip',
		view: 'stoneflow',
		category: 'Collections',
		description: '按真实消费者检查只读元数据、语义状态与紧凑计数三种 Chip 用法。',
		keywords: ['chip', '状态', 'metadata', '计数', '只读'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Metadata、Semantic Status、Count、Short Value',
		verification: 'Lab 可验证；当前生产已有真实消费者',
		Preview: ChipPreview,
	},
	{
		id: 'stoneflow-badge',
		name: 'Badge',
		view: 'stoneflow',
		category: 'Collections',
		description: '检查 Badge 的短数字、99+ 与紧凑操作锚定。',
		keywords: ['badge', '徽标', '99+', 'count', '通知'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Short、Overflow Count、Accent、Warning',
		verification: 'Lab 可验证；当前没有生产消费者，不提前设计在线状态点',
		Preview: BadgePreview,
	},
	{
		id: 'stoneflow-avatar',
		name: 'Avatar',
		view: 'stoneflow',
		category: 'Collections',
		description: '按真实 User App Menu 用法检查 Medium Avatar 的本地图片与缺图 fallback。',
		keywords: ['avatar', '头像', 'fallback', 'empty', 'size'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Medium、Local Image、Fallback',
		verification: 'Lab 可验证本地图片与 fallback；User App Menu 仍需真实应用验证',
		Preview: AvatarPreview,
	},
	{
		id: 'stoneflow-task-row',
		name: 'Task Row',
		view: 'stoneflow',
		category: 'Collections',
		description: '用最小可信任务数据检查行 Hover、连续选择形状、状态、日期与尾部动作。',
		keywords: ['task row', '任务行', 'selection', 'metadata', '尾部操作'],
		owner: 'UI Lab fixture',
		source:
			'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx；src/shared/components/row/RowShell.tsx',
		coverage: 'rendered',
		states:
			'Rest、Row Hover、Adjacent Selection Shape、Hover Reveal Primary Checkbox、长中文、Metadata、Trailing Action',
		verification: 'Lab 可验证组合；Store、Query、写入与业务命令仅真实应用验证',
		Preview: TaskRowPreview,
	},
	{
		id: 'stoneflow-group-header',
		name: 'Group Header',
		view: 'stoneflow',
		category: 'Collections',
		description: '按真实任务分组结构检查独立标题行、计数、创建动作、双击折叠与长中文。',
		keywords: ['group header', '分组头', 'collapse', 'count', '长中文'],
		owner: 'UI Lab fixture',
		source: 'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx',
		coverage: 'rendered',
		states: 'Expanded、Collapsed、Status、Count、Create Action、Double Click、长中文',
		verification: 'Lab 可验证；右键菜单、真实 sticky 与分组模型仅真实应用验证',
		Preview: GroupHeaderPreview,
	},
	{
		id: 'stoneflow-task-board',
		name: 'Task Board',
		view: 'stoneflow',
		category: 'Collections',
		description:
			'并排登记宽容器与 520px 紧凑容器，检查 2px 组间距、#efeff0 Group Header 与三档 Row 状态。',
		keywords: ['task board', '任务面板', '560px', '520px', 'compact', '窄容器'],
		owner: 'UI Lab fixture',
		source:
			'src/ui-lab/samples/ticket-05/collectionsAndTaskSamples.tsx；src/features/task/components/TaskBoard.tsx',
		coverage: 'rendered',
		states: 'Wide、<560 Compact、Selected、长中文、Overflow、Trailing Action',
		verification: 'Lab 可验证布局证据；虚拟滚动、Store、Query、Tauri 与写入仅真实应用验证',
		Preview: TaskBoardPreview,
	},
] as const satisfies readonly UiLabReviewUnitInput[]
