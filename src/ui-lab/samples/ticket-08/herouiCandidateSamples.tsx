import { useState, type ReactNode } from 'react'

import { CalendarDate } from '@internationalized/date'
import {
	Breadcrumbs,
	Button,
	Calendar,
	DateField,
	DatePicker,
	Description,
	Input,
	Label,
	ListBox,
	Modal,
	SearchField,
	Select,
	TextField,
} from '@heroui/react'
import { EmptyState, ListView } from '@heroui-pro/react'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'

function CandidateFrame({
	title,
	scopeLabel = '消费场景',
	scope,
	gap,
	decision,
	boundary = '浏览器 Lab 可验证；业务数据与原生窗口行为留在真实应用。',
	previewClassName = 'bg-surface-secondary',
	children,
}: {
	title: string
	scopeLabel?: '消费场景' | '替换对象'
	scope: string
	gap: string
	decision: string
	boundary?: string
	previewClassName?: string
	children: ReactNode
}) {
	return (
		<div className='flex w-full max-w-4xl flex-col gap-5'>
			<header>
				<h3 className='text-base font-semibold'>{title}</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					使用项目锁定版本与 StoneFlow 当前主题渲染。
				</p>
			</header>

			<div className={`rounded-lg border border-surface p-4 ${previewClassName}`}>{children}</div>

			<dl className='grid gap-3 text-sm sm:grid-cols-2'>
				<div>
					<dt className='text-xs text-muted'>{scopeLabel}</dt>
					<dd className='mt-1 leading-5'>{scope}</dd>
				</div>
				<div>
					<dt className='text-xs text-muted'>能力边界</dt>
					<dd className='mt-1 leading-5'>{gap}</dd>
				</div>
				<div>
					<dt className='text-xs text-muted'>决策状态</dt>
					<dd className='mt-1 leading-5'>{decision}</dd>
				</div>
				<div>
					<dt className='text-xs text-muted'>验证与依赖</dt>
					<dd className='mt-1 leading-5'>{boundary} 现有锁定依赖已足够，未新增 optional peer。</dd>
				</div>
			</dl>
		</div>
	)
}

function HeroUIInputPreview() {
	return (
		<CandidateFrame
			decision='已采用：能渲染、值得保留，生产迁移已完成。'
			gap='裸 Input 不负责标签、说明与校验；表单必须通过 TextField 等语义容器组合。'
			scope='创建表单、设置字段、命令输入与标题编辑。'
			title='HeroUI Input'
		>
			<TextField className='max-w-md' fullWidth name='candidate-title'>
				<Label>任务标题</Label>
				<Input defaultValue='审查输入框焦点与长中文' fullWidth />
				<Description>观察标签、输入内容与键盘焦点，不由 Lab 叠加样式。</Description>
			</TextField>
		</CandidateFrame>
	)
}

function HeroUISelectPreview() {
	return (
		<CandidateFrame
			decision='已采用：能渲染、值得保留，生产迁移已完成。'
			gap='固定小集合适用 Select；可搜索或大数据集合应另用 ComboBox/ListBox。'
			scope='设置、视图编辑与调试筛选中的固定选项。'
			title='HeroUI Select'
		>
			<Select className='max-w-sm' defaultValue='weekly' fullWidth name='review-frequency'>
				<Label>审查频率</Label>
				<Select.Trigger>
					<Select.Value />
					<Select.Indicator />
				</Select.Trigger>
				<Select.Popover>
					<ListBox>
						<ListBox.Item id='daily' textValue='每天'>
							<Label>每天</Label>
							<ListBox.ItemIndicator />
						</ListBox.Item>
						<ListBox.Item id='weekly' textValue='每周'>
							<Label>每周</Label>
							<ListBox.ItemIndicator />
						</ListBox.Item>
					</ListBox>
				</Select.Popover>
			</Select>
		</CandidateFrame>
	)
}

function HeroUIBreadcrumbsPreview() {
	return (
		<CandidateFrame
			decision='已采用：保留 HeroUI 导航语义；StoneFlow 视觉仍待后续生产任务迁移。'
			gap='HeroUI 默认使用蓝色与下划线 Link；Lab 当前统一预览中性文字、Ghost Hover 与 Link 同款 Focus。'
			previewClassName='bg-background'
			scope='HeroUI Breadcrumbs 与共享 AppBreadcrumb 的后续统一。'
			title='HeroUI Breadcrumbs'
		>
			<Breadcrumbs aria-label='HeroUI 候选路径'>
				<Breadcrumbs.Item href='#heroui-breadcrumbs-preview'>工作区</Breadcrumbs.Item>
				<Breadcrumbs.Item href='#heroui-breadcrumbs-preview'>项目</Breadcrumbs.Item>
				<Breadcrumbs.Item>界面审查</Breadcrumbs.Item>
			</Breadcrumbs>
		</CandidateFrame>
	)
}

function HeroUIModalPreview() {
	return (
		<CandidateFrame
			decision='已采用：能渲染、值得保留，生产迁移已完成。'
			gap='网页焦点陷阱可在 Lab 检查；跨 WebView、窗口激活和 Tauri 生命周期只能在真实应用验证。'
			scope='创建、设置、危险确认、更新日志与关于对话框。'
			title='HeroUI Modal'
		>
			<Modal>
				<Button type='button' variant='secondary'>
					打开 Modal
				</Button>
				<Modal.Backdrop>
					<Modal.Container size='sm'>
						<Modal.Dialog>
							<Modal.CloseTrigger />
							<Modal.Header>
								<Modal.Heading>确认审查范围</Modal.Heading>
							</Modal.Header>
							<Modal.Body>此处只有本地交互，不读取 Store，也不调用 Tauri。</Modal.Body>
							<Modal.Footer>
								<Button slot='close' type='button'>
									完成
								</Button>
							</Modal.Footer>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
		</CandidateFrame>
	)
}

function HeroUIEmptyStatePreview() {
	return (
		<CandidateFrame
			decision='已采用：能渲染、值得保留，生产迁移已完成。'
			gap='组件只提供结构；空状态原因、恢复动作与错误处理仍归产品场景。'
			scope='路由失败、项目/任务空列表、Launcher 与更新日志。'
			title='HeroUI EmptyState'
		>
			<EmptyState size='sm'>
				<EmptyState.Header>
					<EmptyState.Title>暂无待审查项</EmptyState.Title>
					<EmptyState.Description>调整目录筛选后，匹配组件会出现在这里。</EmptyState.Description>
				</EmptyState.Header>
				<EmptyState.Content>
					<Button type='button' variant='outline'>
						清空筛选
					</Button>
				</EmptyState.Content>
			</EmptyState>
		</CandidateFrame>
	)
}

function HeroUIListViewPreview() {
	const [lastOpened, setLastOpened] = useState('尚未打开结果')

	return (
		<CandidateFrame
			decision='已采用：能渲染、值得保留，生产迁移已完成。'
			gap='真实搜索排序、快捷键协调与结果路由依赖业务数据，只在真实应用验证。'
			scope='全局搜索结果的任务与项目列表。'
			title='HeroUI ListView'
		>
			<div data-ui-lab-list-view>
				<ListView
					aria-label='HeroUI 候选任务'
					className='max-w-md'
					onAction={(key) => setLastOpened(String(key))}
					selectionMode='none'
					variant='primary'
				>
					<ListView.Item id='task-1' textValue='整理组件清单'>
						<ListView.ItemContent>
							<div className='flex min-w-0 flex-col gap-1'>
								<ListView.Title>整理组件清单</ListView.Title>
								<ListView.Description>UI Lab</ListView.Description>
							</div>
						</ListView.ItemContent>
						<ListView.ItemAction>
							<time className='whitespace-nowrap text-xs text-muted'>今天</time>
						</ListView.ItemAction>
					</ListView.Item>
					<ListView.Item id='task-2' textValue='复核长中文标题'>
						<ListView.ItemContent>
							<div className='flex min-w-0 flex-col gap-1'>
								<ListView.Title>复核长中文标题在窄容器中的截断与动作可见性</ListView.Title>
								<ListView.Description>设计系统</ListView.Description>
							</div>
						</ListView.ItemContent>
						<ListView.ItemAction>
							<time className='whitespace-nowrap text-xs text-muted'>明天</time>
						</ListView.ItemAction>
					</ListView.Item>
				</ListView>
				<p className='mt-3 text-sm text-muted' role='status'>
					最近打开：{lastOpened}
				</p>
			</div>
		</CandidateFrame>
	)
}

function HeroUISearchFieldPreview() {
	const [query, setQuery] = useState('组件')

	return (
		<CandidateFrame
			decision='能渲染；原替换假设已失效，未由本 Lab 追加迁移批准。'
			gap='当前 GlobalSearchInput 已使用 SearchField；仍需在真实查询、方向键高亮、全局快捷键与 Tauri 窗口中回归。'
			scope='规格原计划替换全局搜索的 Input；代码审计显示该消费方已经迁移。'
			scopeLabel='替换对象'
			title='HeroUI SearchField'
		>
			<SearchField
				className='max-w-md'
				fullWidth
				name='candidate-search'
				onChange={setQuery}
				onClear={() => setQuery('')}
				value={query}
				variant='secondary'
			>
				<Label>搜索任务与项目</Label>
				<SearchField.Group>
					<SearchField.SearchIcon />
					<SearchField.Input placeholder='输入关键词' />
					<SearchField.ClearButton aria-label='清空候选搜索' />
				</SearchField.Group>
				<Description>当前查询：{query || '空值'}</Description>
			</SearchField>
		</CandidateFrame>
	)
}

function HeroUIDatePickerPreview() {
	return (
		<CandidateFrame
			decision='能渲染、值得继续评估；尚未批准迁移。'
			gap='需覆盖快捷日期、清除值、日期字符串转换、抽屉浮层归属与焦点恢复，不能只比较外观。'
			scope='CustomDateDialog 的 Calendar + Modal，以及 Launcher DateControl 的 Calendar + Popover。'
			scopeLabel='替换对象'
			title='HeroUI DatePicker'
		>
			<DatePicker
				className='max-w-sm'
				defaultValue={new CalendarDate(2026, 8, 26)}
				name='candidate-date'
			>
				<Label>审查日期</Label>
				<DateField.Group fullWidth>
					<DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
					<DateField.Suffix>
						<DatePicker.Trigger>
							<DatePicker.TriggerIndicator />
						</DatePicker.Trigger>
					</DateField.Suffix>
				</DateField.Group>
				<Description>这里只验证原生组合；不会写入任务日期。</Description>
				<DatePicker.Popover>
					<Calendar aria-label='候选审查日期'>
						<Calendar.Header>
							<Calendar.NavButton slot='previous' />
							<Calendar.Heading />
							<Calendar.NavButton slot='next' />
						</Calendar.Header>
						<Calendar.Grid>
							<Calendar.GridHeader>
								{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
							</Calendar.GridHeader>
							<Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
						</Calendar.Grid>
					</Calendar>
				</DatePicker.Popover>
			</DatePicker>
		</CandidateFrame>
	)
}

export const TICKET_08_SAMPLES: readonly UiLabReviewUnitInput[] = [
	{
		id: 'heroui-button',
		name: 'HeroUI Button',
		view: 'heroui',
		category: '已采用',
		description: '已采用并与 StoneFlow Button 共享组件和主题；目录只记录归属。',
		keywords: ['button', '按钮', 'action', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'button',
		states: '采用状态；交互状态由 StoneFlow Button 覆盖',
		verification: '复用 StoneFlow Button 的 Lab 验证',
	},
	{
		id: 'heroui-input',
		name: 'HeroUI Input',
		view: 'heroui',
		category: '已采用',
		description: '核对 Input 在真实字段语义容器中的基础输入与焦点状态。',
		keywords: ['input', '输入框', 'textfield', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Filled、Hover、Pointer Focus、Keyboard Focus',
		verification: 'Lab 可验证；业务校验由消费方验证',
		Preview: HeroUIInputPreview,
	},
	{
		id: 'heroui-select',
		name: 'HeroUI Select',
		view: 'heroui',
		category: '已采用',
		description: '核对固定小集合的 Select 触发器、Popover 与键盘选择。',
		keywords: ['select', '选择器', 'listbox', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Rest、Open、Selected、Keyboard Navigation',
		verification: 'Lab 可验证；真实选项来源由消费方验证',
		Preview: HeroUISelectPreview,
	},
	{
		id: 'heroui-breadcrumbs',
		name: 'HeroUI Breadcrumbs',
		view: 'heroui',
		category: '已采用',
		description: '核对层级导航语义，以及 StoneFlow 拟采用的 Ghost Hover 与 Link 同款 Focus。',
		keywords: ['breadcrumbs', '面包屑', '导航', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Rest、Hover、Keyboard Focus、Current',
		verification: 'Lab 可验证目标视觉；真实路由由已采用该家族的 AppBreadcrumb 验证',
		Preview: HeroUIBreadcrumbsPreview,
	},
	{
		id: 'heroui-tooltip',
		name: 'HeroUI Tooltip',
		view: 'heroui',
		category: '已采用',
		description: '核对指针与键盘触发的非必要补充说明。',
		keywords: ['tooltip', '提示', 'hover', 'focus', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'tooltip',
		states: 'Hover、Keyboard Focus、Open、Closed',
		verification: 'Lab 可验证；不得承担必要信息',
	},
	{
		id: 'heroui-modal',
		name: 'HeroUI Modal',
		view: 'heroui',
		category: '已采用',
		description: '核对真实 Modal 的打开、关闭、焦点陷阱与焦点返回。',
		keywords: ['modal', 'dialog', '对话框', 'overlay', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Keyboard Focus、Escape',
		verification: 'Lab 可验证；原生窗口焦点仅真实应用',
		Preview: HeroUIModalPreview,
	},
	{
		id: 'heroui-empty-state',
		name: 'HeroUI EmptyState',
		view: 'heroui',
		category: '已采用',
		description: '核对空状态的标题、说明与恢复动作结构。',
		keywords: ['empty state', '空状态', 'feedback', '已采用'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Empty、With Description、With Action',
		verification: 'Lab 可验证；错误恢复逻辑由消费方验证',
		Preview: HeroUIEmptyStatePreview,
	},
	{
		id: 'heroui-list-view',
		name: 'HeroUI ListView',
		view: 'heroui',
		category: '已采用',
		description: '核对搜索结果 ListView 的 Primary 表面、none 模式、标题层级、时间与键盘路径。',
		keywords: ['listview', 'list view', '列表', '搜索结果', '已采用'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Primary、None、Hover、Action、Time、Keyboard Focus、Long Content',
		verification: 'Lab 可验证；查询与路由仅真实应用',
		Preview: HeroUIListViewPreview,
	},
	{
		id: 'heroui-search-field-candidate',
		name: 'HeroUI SearchField',
		view: 'heroui',
		category: '已采用',
		description: '复核生产已采用的 SearchField；不再把现状误标为替换候选。',
		keywords: ['searchfield', 'search field', '搜索', 'input', '已采用'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Empty、Filled、Clear、Keyboard Focus',
		verification: 'Lab 可渲染；真实全局搜索链路仅真实应用',
		Preview: HeroUISearchFieldPreview,
	},
	{
		id: 'heroui-date-picker-candidate',
		name: 'HeroUI DatePicker',
		view: 'heroui',
		category: '探索中',
		description: '保留已审查的 DatePicker 参考；当前不把它登记为生产替换候选。',
		keywords: ['datepicker', 'date picker', '日期', 'calendar', 'popover', 'modal', '探索中'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Filled、Open、Selected、Keyboard Navigation',
		verification: 'Lab 可渲染；业务日期与浮层归属仅真实应用',
		Preview: HeroUIDatePickerPreview,
	},
]
