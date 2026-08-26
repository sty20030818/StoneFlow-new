import { useState } from 'react'

import {
	Button,
	ButtonGroup,
	Link,
	Separator,
	Spinner,
	ToggleButton,
	ToggleButtonGroup,
	Toolbar,
} from '@heroui/react'
import {
	AlignCenterIcon,
	AlignLeftIcon,
	CheckIcon,
	FilterIcon,
	ListFilterIcon,
	MoreHorizontalIcon,
	PlusIcon,
	Rows3Icon,
	XIcon,
} from 'lucide-react'

import { PageFrame } from '@/shared/components/page-frame'

function FoundationsColorTypographyPreview() {
	return (
		<div className='w-full max-w-5xl space-y-6'>
			<header>
				<h3 className='text-base font-semibold'>语义颜色与排版</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					以下证据直接使用当前主题的语义 utility 与现有字体，不复制颜色值或排版 token。
				</p>
			</header>

			<section aria-labelledby='foundation-color-heading'>
				<h4 className='text-sm font-medium' id='foundation-color-heading'>
					语义角色
				</h4>
				<div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
					<div className='rounded-lg border border-border bg-background p-3 text-foreground'>
						<p className='text-sm font-medium'>Background</p>
						<p className='mt-1 text-xs text-muted'>页面底层与主要文字</p>
					</div>
					<div className='rounded-lg border border-border bg-surface p-3 text-surface-foreground'>
						<p className='text-sm font-medium'>Surface</p>
						<p className='mt-1 text-xs text-muted'>承载内容的安静表面</p>
					</div>
					<div className='rounded-lg border border-border bg-surface-secondary p-3 text-surface-secondary-foreground'>
						<p className='text-sm font-medium'>Surface secondary</p>
						<p className='mt-1 text-xs'>次级区域与辅助层级</p>
					</div>
					<div className='rounded-lg bg-accent p-3 text-accent-foreground'>
						<p className='text-sm font-medium'>Accent</p>
						<p className='mt-1 text-xs'>只承担主操作与小面积状态</p>
					</div>
					<div className='rounded-lg border border-accent-border bg-accent-soft p-3 text-accent-soft-foreground'>
						<p className='text-sm font-medium'>Accent soft</p>
						<p className='mt-1 text-xs'>低强度选择与提示</p>
					</div>
					<div className='rounded-lg bg-success p-3 text-success-foreground'>
						<p className='text-sm font-medium'>成功 · Success</p>
						<p className='mt-1 text-xs'>操作已经完成</p>
					</div>
					<div className='rounded-lg bg-warning p-3 text-warning-foreground'>
						<p className='text-sm font-medium'>警告 · Warning</p>
						<p className='mt-1 text-xs'>需要留意但未失败</p>
					</div>
					<div className='rounded-lg bg-info p-3 text-info-foreground'>
						<p className='text-sm font-medium'>信息 · Info</p>
						<p className='mt-1 text-xs'>中性说明与系统提示</p>
					</div>
					<div className='rounded-lg bg-danger p-3 text-danger-foreground'>
						<p className='text-sm font-medium'>危险 · Danger</p>
						<p className='mt-1 text-xs'>不可逆或高风险动作</p>
					</div>
				</div>
			</section>

			<section aria-labelledby='foundation-type-heading' className='border-t border-separator pt-5'>
				<h4 className='text-sm font-medium' id='foundation-type-heading'>
					排版层级与换行
				</h4>
				<div className='mt-3 max-w-3xl space-y-4'>
					<div>
						<p className='text-xs text-muted'>页面标题</p>
						<p className='mt-1 text-lg font-semibold leading-7'>今天要完成的工作</p>
					</div>
					<div>
						<p className='text-xs text-muted'>分组标题 · Short English</p>
						<p className='mt-1 text-base font-semibold'>Review calmly</p>
					</div>
					<p className='text-sm leading-6'>
						正文用于连续阅读：先判断信息的责任归属，再决定问题应该由上游组件、全局主题、共享 recipe
						还是产品模块处理。
					</p>
					<p className='text-sm leading-6 text-muted'>
						这是一段刻意较长的中文辅助信息，用来观察窄容器内的自然换行、行间距和扫描性；它不应该依赖截断才能维持布局，也不应该抢过主要内容的视觉层级。
					</p>
					<div className='flex flex-wrap items-center gap-3'>
						<span className='text-xs font-medium'>紧凑标签</span>
						<span className='text-xs text-muted'>最后更新 14:32</span>
						<code className='font-mono text-xs text-muted'>SF-2408</code>
					</div>
				</div>
			</section>
		</div>
	)
}

function FoundationsGeometryPreview() {
	return (
		<div className='w-full max-w-5xl space-y-6'>
			<header>
				<h3 className='text-base font-semibold'>几何、边界与图标基线</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					通过真实布局 utility、HeroUI Button 与当前 Surface 效果观察 4/8/12 节奏和 28/32/36
					控件高度。
				</p>
			</header>

			<section aria-labelledby='foundation-spacing-heading'>
				<h4 className='text-sm font-medium' id='foundation-spacing-heading'>
					间距节奏
				</h4>
				<div className='mt-3 flex flex-wrap items-end gap-6'>
					<div>
						<p className='mb-2 text-xs text-muted'>4px · gap-1</p>
						<div className='flex gap-1 rounded-md border border-border p-2'>
							<span className='size-5 rounded-sm bg-accent-soft' />
							<span className='size-5 rounded-sm bg-accent-soft' />
							<span className='size-5 rounded-sm bg-accent-soft' />
						</div>
					</div>
					<div>
						<p className='mb-2 text-xs text-muted'>8px · gap-2</p>
						<div className='flex gap-2 rounded-md border border-border p-2'>
							<span className='size-5 rounded-sm bg-accent-soft' />
							<span className='size-5 rounded-sm bg-accent-soft' />
							<span className='size-5 rounded-sm bg-accent-soft' />
						</div>
					</div>
					<div>
						<p className='mb-2 text-xs text-muted'>12px · gap-3</p>
						<div className='flex gap-3 rounded-md border border-border p-2'>
							<span className='size-5 rounded-sm bg-accent-soft' />
							<span className='size-5 rounded-sm bg-accent-soft' />
							<span className='size-5 rounded-sm bg-accent-soft' />
						</div>
					</div>
				</div>
			</section>

			<section
				aria-labelledby='foundation-control-heading'
				className='border-t border-separator pt-5'
			>
				<h4 className='text-sm font-medium' id='foundation-control-heading'>
					控件高度与图标
				</h4>
				<div className='mt-3 flex flex-wrap items-center gap-3'>
					<Button size='sm' type='button' variant='outline'>
						28 · Small
					</Button>
					<Button size='md' type='button' variant='outline'>
						32 · Medium
					</Button>
					<Button size='lg' type='button' variant='outline'>
						36 · Large
					</Button>
					<Button aria-label='筛选任务' isIconOnly size='sm' type='button' variant='ghost'>
						<ListFilterIcon aria-hidden className='size-4' />
					</Button>
					<Button size='sm' type='button' variant='secondary'>
						<PlusIcon aria-hidden className='size-4' />
						图标与文字
					</Button>
				</div>
			</section>

			<section
				aria-labelledby='foundation-radius-heading'
				className='border-t border-separator pt-5'
			>
				<h4 className='text-sm font-medium' id='foundation-radius-heading'>
					圆角、边框与阴影
				</h4>
				<div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
					<div className='rounded-md border border-border bg-surface p-3'>
						<p className='text-sm font-medium'>6px · Control</p>
						<p className='mt-1 text-xs text-muted'>普通控件与导航行</p>
					</div>
					<div className='rounded-lg border border-border bg-surface p-3'>
						<p className='text-sm font-medium'>8px · Surface</p>
						<p className='mt-1 text-xs text-muted'>内容表面与行分组</p>
					</div>
					<div className='rounded-xl border border-border bg-overlay p-3 shadow-overlay'>
						<p className='text-sm font-medium'>12px · Overlay</p>
						<p className='mt-1 text-xs text-muted'>浮层 elevation</p>
					</div>
					<div className='rounded-lg border border-separator bg-surface-secondary p-3'>
						<p className='text-sm font-medium'>1px · Separator</p>
						<p className='mt-1 text-xs text-muted'>低噪声结构边界</p>
					</div>
				</div>
			</section>
		</div>
	)
}

function StoneFlowButtonPreview() {
	const [presses, setPresses] = useState(0)
	const recordPress = () => setPresses((count) => count + 1)

	return (
		<div className='w-full max-w-5xl space-y-6'>
			<header>
				<h3 className='text-base font-semibold'>StoneFlow Button</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					直接比较项目现有七种语义变体；Accent 只在推动当前任务的主要动作中出现。
				</p>
			</header>

			<section aria-labelledby='button-variant-heading'>
				<h4 className='text-sm font-medium' id='button-variant-heading'>
					语义变体
				</h4>
				<div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='primary'>
							新建任务
						</Button>
						<p className='text-xs text-muted'>Primary：推动当前流程的唯一主操作</p>
					</div>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='secondary'>
							保存视图
						</Button>
						<p className='text-xs text-muted'>Secondary：明确但不抢主层级的动作</p>
					</div>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='tertiary'>
							稍后处理
						</Button>
						<p className='text-xs text-muted'>Tertiary：低强调或退出当前流程</p>
					</div>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='outline'>
							筛选
						</Button>
						<p className='text-xs text-muted'>Outline：工具栏中的次级入口</p>
					</div>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='ghost'>
							取消
						</Button>
						<p className='text-xs text-muted'>Ghost：上下文已足够清楚的轻动作</p>
					</div>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='danger'>
							永久删除
						</Button>
						<p className='text-xs text-muted'>Danger：高风险且不可逆的确认</p>
					</div>
					<div className='space-y-2'>
						<Button onPress={recordPress} type='button' variant='danger-soft'>
							移到废纸篓
						</Button>
						<p className='text-xs text-muted'>Danger soft：可恢复但仍需警示的动作</p>
					</div>
				</div>
			</section>

			<section aria-labelledby='button-size-heading' className='border-t border-separator pt-5'>
				<h4 className='text-sm font-medium' id='button-size-heading'>
					尺寸与内容
				</h4>
				<div className='mt-3 flex flex-wrap items-center gap-3'>
					<Button onPress={recordPress} size='sm' type='button' variant='secondary'>
						Small
					</Button>
					<Button onPress={recordPress} size='md' type='button' variant='secondary'>
						Medium
					</Button>
					<Button onPress={recordPress} size='lg' type='button' variant='secondary'>
						Large
					</Button>
					<Button onPress={recordPress} size='sm' type='button' variant='secondary'>
						<PlusIcon aria-hidden className='size-4' />
						添加
					</Button>
					<Button
						aria-label='更多操作'
						isIconOnly
						onPress={recordPress}
						size='sm'
						type='button'
						variant='ghost'
					>
						<MoreHorizontalIcon aria-hidden className='size-4' />
					</Button>
				</div>
				<div className='mt-3 grid gap-3 sm:grid-cols-2'>
					<Button fullWidth onPress={recordPress} type='button' variant='outline'>
						保存这份包含很多筛选条件和较长中文名称的工作视图
					</Button>
					<div className='flex flex-wrap items-center gap-3'>
						<Button isDisabled type='button' variant='secondary'>
							暂不可用
						</Button>
						<Button isPending type='button'>
							{({ isPending }) => (
								<>
									{isPending ? <Spinner aria-hidden color='current' size='sm' /> : null}
									正在保存
								</>
							)}
						</Button>
					</div>
				</div>
			</section>

			<p aria-live='polite' className='text-sm text-muted'>
				已触发 {presses} 次
			</p>
			<p className='text-xs leading-5 text-muted'>
				用指针点击后观察 Pointer Focus，再用 Tab 返回这些按钮观察 Keyboard Focus
				Visible；按住按钮可观察 Pressed。
			</p>
		</div>
	)
}

function ActionGroupsPreview() {
	const [actions, setActions] = useState(0)

	return (
		<div className='w-full max-w-5xl space-y-5'>
			<header>
				<h3 className='text-base font-semibold'>动作分组与 Toolbar</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					Toolbar 保留一个 Tab 停靠点，组内通过方向键移动；单选与复选使用真实 ToggleButtonGroup。
				</p>
			</header>

			<Toolbar aria-label='审查动作工具栏' className='flex flex-wrap gap-3'>
				<ButtonGroup aria-label='批量动作' size='sm' variant='tertiary'>
					<Button onPress={() => setActions((count) => count + 1)} type='button'>
						<CheckIcon aria-hidden className='size-4' />
						完成
					</Button>
					<Button onPress={() => setActions((count) => count + 1)} type='button'>
						<ButtonGroup.Separator />
						稍后
					</Button>
					<Button aria-label='更多批量操作' isDisabled isIconOnly type='button'>
						<ButtonGroup.Separator />
						<MoreHorizontalIcon aria-hidden className='size-4' />
					</Button>
				</ButtonGroup>

				<Separator orientation='vertical' />

				<ToggleButtonGroup
					aria-label='内容密度'
					defaultSelectedKeys={['comfortable']}
					disallowEmptySelection
					selectionMode='single'
					size='sm'
				>
					<ToggleButton aria-label='紧凑密度' id='compact' isIconOnly>
						<Rows3Icon aria-hidden className='size-4' />
					</ToggleButton>
					<ToggleButton aria-label='舒适密度' id='comfortable' isIconOnly>
						<ToggleButtonGroup.Separator />
						<AlignCenterIcon aria-hidden className='size-4' />
					</ToggleButton>
				</ToggleButtonGroup>

				<ToggleButtonGroup
					aria-label='显示内容'
					defaultSelectedKeys={['details']}
					selectionMode='multiple'
					size='sm'
				>
					<ToggleButton id='details'>详情</ToggleButton>
					<ToggleButton id='subtasks'>
						<ToggleButtonGroup.Separator />
						子任务
					</ToggleButton>
					<ToggleButton id='archived' isDisabled>
						<ToggleButtonGroup.Separator />
						归档
					</ToggleButton>
				</ToggleButtonGroup>
			</Toolbar>

			<p aria-live='polite' className='text-sm text-muted'>
				动作已触发 {actions} 次
			</p>
			<p className='text-xs leading-5 text-muted'>
				可观察 Rest、Hover、Pressed、Selected、Disabled 与 Keyboard Focus
				Visible；本场景不创建业务工具栏。
			</p>
		</div>
	)
}

function LinkActionPreview() {
	const [actions, setActions] = useState(0)

	return (
		<div className='w-full max-w-3xl space-y-5'>
			<header>
				<h3 className='text-base font-semibold'>Link 与按钮动作</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					链接负责导航，按钮负责改变当前界面状态，当前项不再提供可激活的链接。
				</p>
			</header>

			<nav aria-label='链接语义示例' className='flex flex-wrap items-center gap-4'>
				<Link href='#link-preview-target'>前往检查说明</Link>
				<span aria-current='page' className='text-sm font-medium'>
					当前检查项
				</span>
				<Button onPress={() => setActions((count) => count + 1)} type='button' variant='ghost'>
					标记已检查
				</Button>
			</nav>

			<div
				className='rounded-lg border border-separator bg-surface-secondary p-3'
				id='link-preview-target'
			>
				<p className='text-sm'>导航目标仍在当前实验室内，不触发业务路由或外部副作用。</p>
				<p aria-live='polite' className='mt-1 text-xs text-muted'>
					按钮动作已触发 {actions} 次
				</p>
			</div>

			<p className='text-xs leading-5 text-muted'>
				分别用指针与 Tab 触发真实 Hover、Pressed 和 Focus Visible；Lab 不覆盖 Link 的颜色或下划线。
			</p>
		</div>
	)
}

const PAGE_FRAME_PILLS = [
	{ key: 'all', label: '全部' },
	{ key: 'doing', label: '进行中' },
	{ key: 'done', label: '已完成' },
]

function PageFrameScenePreview() {
	const [mode, setMode] = useState('regular')
	const [selectedKey, setSelectedKey] = useState('all')
	const [filterVisible, setFilterVisible] = useState(true)
	const title =
		mode === 'long'
			? '跨团队产品体验一致性审查与下一阶段工作安排'
			: mode === 'narrow'
				? '窄容器任务视图'
				: '今天'

	return (
		<div className='w-full max-w-5xl space-y-4'>
			<header className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h3 className='text-base font-semibold'>PageFrame 组合场景</h3>
					<p className='mt-1 text-sm leading-6 text-muted'>
						只组合公开 PageFrame 与无副作用 fixture，用于观察标题、工具栏、筛选和内容层级。
					</p>
				</div>
				<ToggleButtonGroup
					aria-label='PageFrame 条件'
					disallowEmptySelection
					onSelectionChange={(keys) => {
						const nextMode = keys.values().next().value
						if (typeof nextMode === 'string') setMode(nextMode)
					}}
					selectedKeys={[mode]}
					selectionMode='single'
					size='sm'
				>
					<ToggleButton id='regular'>常规</ToggleButton>
					<ToggleButton id='long'>
						<ToggleButtonGroup.Separator />
						长标题
					</ToggleButton>
					<ToggleButton id='narrow'>
						<ToggleButtonGroup.Separator />
						窄容器
					</ToggleButton>
				</ToggleButtonGroup>
			</header>

			<p aria-live='polite' className='text-xs text-muted'>
				当前条件：{mode === 'regular' ? '常规' : mode === 'long' ? '长标题' : '窄容器'}
			</p>

			<div
				className={`${
					mode === 'narrow' ? 'w-80 max-w-full' : 'w-full max-w-4xl'
				} min-h-96 overflow-hidden rounded-lg border border-surface bg-background`}
			>
				<PageFrame.Root>
					<PageFrame.Header
						actions={
							<Button aria-label='创建任务' isIconOnly size='sm' type='button' variant='outline'>
								<PlusIcon aria-hidden className='size-4' />
							</Button>
						}
						title={title}
					/>
					<PageFrame.Toolbar
						displayAction={
							<Button aria-label='显示选项' isIconOnly size='sm' type='button' variant='outline'>
								<AlignLeftIcon aria-hidden className='size-4' />
							</Button>
						}
						filterAction={
							<Button
								aria-pressed={filterVisible}
								onPress={() => setFilterVisible((visible) => !visible)}
								size='sm'
								type='button'
								variant='outline'
							>
								<FilterIcon aria-hidden className='size-4' />
								筛选
							</Button>
						}
						filterBar={
							filterVisible ? (
								<div className='flex min-w-0 items-center gap-2 rounded-md border border-separator bg-surface-secondary px-2 py-1'>
									<span className='truncate text-xs text-muted'>状态等于进行中</span>
									<Button
										aria-label='移除状态筛选'
										isIconOnly
										onPress={() => setFilterVisible(false)}
										size='sm'
										type='button'
										variant='ghost'
									>
										<XIcon aria-hidden className='size-4' />
									</Button>
								</div>
							) : null
						}
						onSelectionChange={setSelectedKey}
						pills={PAGE_FRAME_PILLS}
						selectedKey={selectedKey}
					/>
					<PageFrame.Body>
						<ul aria-label='示例任务' className='divide-y divide-separator'>
							<li className='py-3'>
								<p className='text-sm font-medium'>检查按钮语义层级</p>
								<p className='mt-1 text-xs text-muted'>今天 · UI Lab</p>
							</li>
							<li className='py-3'>
								<p className='text-sm font-medium'>记录键盘焦点与指针焦点差异</p>
								<p className='mt-1 text-xs text-muted'>进行中 · 体验审查</p>
							</li>
							<li className='py-3'>
								<p className='text-sm font-medium'>
									验证一条包含较长中文标题的任务在窄容器中是否仍然易于扫描和理解
								</p>
								<p className='mt-1 text-xs text-muted'>待处理 · 长文本证据</p>
							</li>
						</ul>
					</PageFrame.Body>
				</PageFrame.Root>
			</div>
		</div>
	)
}

export const TICKET_02_SAMPLES = [
	{
		id: 'foundations-color-typography',
		name: '语义颜色与排版',
		view: 'stoneflow',
		category: 'Foundations',
		description: '观察当前主题实际生效的语义角色、文字层级、中英文与长中文换行。',
		keywords: ['foundation', 'color', 'typography', '颜色', '排版', '长中文'],
		owner: '全局主题（语义值）',
		states: 'Rest、长中文、窄容器',
		verification: 'Lab 可验证；对比度仍需浏览器实测',
		Preview: FoundationsColorTypographyPreview,
	},
	{
		id: 'foundations-geometry',
		name: '几何、边界与图标',
		view: 'stoneflow',
		category: 'Foundations',
		description: '比较实际 4/8/12 间距、28/32/36 控件高度、圆角、边框、阴影和图标基线。',
		keywords: ['foundation', 'spacing', 'radius', 'height', 'icon', '间距', '圆角', '图标'],
		owner: '全局主题 + HeroUI OSS',
		states: 'Rest、Hover、Pressed、Pointer Focus、Keyboard Focus Visible',
		verification: 'Lab 可验证；像素与缩放需浏览器实测',
		Preview: FoundationsGeometryPreview,
	},
	{
		id: 'stoneflow-button',
		name: 'StoneFlow Button',
		view: 'stoneflow',
		category: 'Actions',
		description:
			'比较真实 Button 语义变体、尺寸与状态；全局主题提供语义颜色，StoneFlow recipe 只收敛密度。',
		keywords: ['button', '按钮', '主操作', 'action', 'loading', 'disabled', '长文案'],
		owner: 'HeroUI OSS（结构/状态）',
		states: 'Rest、Hover、Pressed、Pointer Focus、Keyboard Focus Visible、Disabled、Loading',
		verification: 'Lab 可验证',
		Preview: StoneFlowButtonPreview,
	},
	{
		id: 'actions-groups-toolbar',
		name: '动作分组与 Toolbar',
		view: 'stoneflow',
		category: 'Actions',
		description: '操作真实 ButtonGroup、ToggleButtonGroup 与 Toolbar 的分组、选择和禁用状态。',
		keywords: ['button group', 'toggle', 'toolbar', '分组', '工具栏', '单选', '复选'],
		owner: 'HeroUI OSS',
		states: 'Rest、Hover、Pressed、Selected、Pointer Focus、Keyboard Focus Visible、Disabled',
		verification: 'Lab 可验证',
		Preview: ActionGroupsPreview,
	},
	{
		id: 'actions-link-semantics',
		name: 'Link 与按钮动作',
		view: 'stoneflow',
		category: 'Actions',
		description:
			'比较导航链接、当前项和界面动作；HeroUI 提供结构状态，全局主题提供语义颜色，产品决定动作语义。',
		keywords: ['link', '链接', '导航', 'button', 'hover', 'focus'],
		owner: 'HeroUI OSS（Link 结构/状态）',
		states: 'Rest、Hover、Pressed、Current、Pointer Focus、Keyboard Focus Visible',
		verification: 'Lab 可验证；真实路由需应用 smoke',
		Preview: LinkActionPreview,
	},
	{
		id: 'page-frame-scene',
		name: 'PageFrame 组合场景',
		view: 'stoneflow',
		category: 'Product Scenes',
		description: '用最小真实组合观察 PageFrame 标题、Toolbar、Filter、长中文与窄容器。',
		keywords: ['pageframe', 'page frame', '页面框架', 'toolbar', 'filter', '长标题', '窄容器'],
		owner: '共享 PageFrame（产品结构）',
		states: 'Rest、Hover、Pressed、Selected、Pointer Focus、Keyboard Focus Visible、长标题、窄容器',
		verification: 'Lab 可验证；真实 WebView 与窗口缩放需应用 smoke',
		Preview: PageFrameScenePreview,
	},
] as const
