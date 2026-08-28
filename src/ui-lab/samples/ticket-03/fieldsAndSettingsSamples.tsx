import { useEffect, useRef, useState } from 'react'

import { CalendarDate } from '@internationalized/date'
import {
	Alert,
	Button,
	Card,
	Checkbox,
	ComboBox,
	Description,
	FieldError,
	Form,
	Input,
	Label,
	ListBox,
	NumberField,
	Radio,
	RadioGroup,
	SearchField,
	Select,
	Spinner,
	Switch,
	TextArea,
	TextField,
	ToggleButton,
	DateField,
} from '@heroui/react'

import type { UiLabSample } from '../../uiLabCatalog'

function FieldStatesPreview() {
	const [query, setQuery] = useState('长期目标')

	return (
		<div className='grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]'>
			<div className='grid min-w-0 gap-4 sm:grid-cols-2'>
				<TextField fullWidth name='empty-name'>
					<Label>空值与占位符</Label>
					<Input fullWidth placeholder='例如：整理项目首页' />
					<Description>占位符只提供格式示例，不代替标签。</Description>
				</TextField>

				<TextField
					defaultValue='把跨窗口同步中的失败恢复路径整理成一条可验证的长期规则'
					fullWidth
					name='filled-name'
				>
					<Label>已填长中文</Label>
					<Input fullWidth />
					<Description>缩窄窗口检查输入内容、标签与说明的换行。</Description>
				</TextField>

				<TextField
					defaultValue='由当前空间继承，不能在这里修改'
					fullWidth
					isReadOnly
					name='readonly-name'
				>
					<Label>只读字段</Label>
					<Input fullWidth />
					<Description>只读仍可聚焦和复制；它不是禁用状态。</Description>
				</TextField>

				<TextField defaultValue='等待管理员启用' fullWidth isDisabled name='disabled-name'>
					<Label>禁用字段</Label>
					<Input fullWidth />
					<Description>不可用原因通过常驻文字说明。</Description>
				</TextField>

				<TextField fullWidth isInvalid isRequired name='required-name'>
					<Label>显示名称（必填）</Label>
					<Input fullWidth />
					<FieldError>请输入显示名称，不能只依赖红色边框判断错误。</FieldError>
				</TextField>

				<TextField
					defaultValue='这是用于检查多行输入、长中文换行和窄容器重排的无副作用内容。它不会写入任务、设置或数据库。'
					fullWidth
					name='long-note'
				>
					<Label>说明</Label>
					<TextArea fullWidth rows={4} />
					<Description>多行文本保留自然高度，不限制用户缩放。</Description>
				</TextField>
			</div>

			<div className='flex min-w-0 flex-col gap-4'>
				<SearchField
					fullWidth
					name='field-search'
					onChange={setQuery}
					onClear={() => setQuery('')}
					value={query}
					variant='secondary'
				>
					<Label>SearchField 可清除查询</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder='搜索设置项' />
						<SearchField.ClearButton aria-label='清空字段搜索' />
					</SearchField.Group>
					<Description>当前查询：{query || '空值'}</Description>
				</SearchField>

				<SearchField
					aria-busy='true'
					defaultValue='正在同步'
					fullWidth
					isReadOnly
					name='loading-search'
					variant='secondary'
				>
					<Label>加载中的 SearchField</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input />
						<Spinner className='me-2' color='current' size='sm' />
					</SearchField.Group>
					<Description>加载状态同时使用忙碌语义、动画和文字说明。</Description>
				</SearchField>

				<div className='rounded-lg border border-surface bg-surface-secondary p-4'>
					<h3 className='text-sm font-semibold'>Pointer / Keyboard Focus 对照</h3>
					<ol className='mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-muted'>
						<li>先用指针点击下面的字段，观察真实 Pointer Focus。</li>
						<li>再点击空白处并按 Tab，观察真实 Keyboard Focus Visible。</li>
					</ol>
					<TextField className='mt-3' fullWidth name='focus-comparison'>
						<Label>焦点对照字段</Label>
						<Input fullWidth placeholder='不要由 Lab 叠加焦点样式' />
					</TextField>
				</div>
			</div>
		</div>
	)
}

function CompositeFieldsPreview() {
	return (
		<div className='grid w-full min-w-0 gap-5 sm:grid-cols-2'>
			<NumberField defaultValue={12} fullWidth maxValue={99} minValue={0} name='daily-limit'>
				<Label>每日任务上限</Label>
				<NumberField.Group>
					<NumberField.DecrementButton />
					<NumberField.Input />
					<NumberField.IncrementButton />
				</NumberField.Group>
				<Description>可输入数字，也可用箭头键或增减按钮调整。</Description>
			</NumberField>

			<DateField defaultValue={new CalendarDate(2026, 8, 26)} fullWidth name='review-date'>
				<Label>审查日期</Label>
				<DateField.Group>
					<DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
				</DateField.Group>
				<Description>使用已安装的 @internationalized/date，不在 Lab 重写日期行为。</Description>
			</DateField>

			<Select defaultValue='daily' fullWidth name='sync-frequency' placeholder='请选择频率'>
				<Label>同步频率</Label>
				<Select.Trigger>
					<Select.Value />
					<Select.Indicator />
				</Select.Trigger>
				<Description>打开后可用方向键浏览，并按 Enter 选择。</Description>
				<Select.Popover>
					<ListBox>
						<ListBox.Item id='manual' textValue='手动'>
							<Label>手动</Label>
							<ListBox.ItemIndicator />
						</ListBox.Item>
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

			<ComboBox defaultValue='review' fullWidth menuTrigger='input' name='workspace'>
				<Label>工作区</Label>
				<ComboBox.InputGroup>
					<Input placeholder='搜索工作区' />
					<ComboBox.Trigger aria-label='展开工作区选项' />
				</ComboBox.InputGroup>
				<Description>输入文字过滤真实 ListBox；Escape 关闭并返回输入框。</Description>
				<ComboBox.Popover>
					<ListBox>
						<ListBox.Item id='inbox' textValue='收件箱'>
							<Label>收件箱</Label>
							<ListBox.ItemIndicator />
						</ListBox.Item>
						<ListBox.Item id='review' textValue='产品审查'>
							<Label>产品审查</Label>
							<ListBox.ItemIndicator />
						</ListBox.Item>
						<ListBox.Item id='archive' textValue='长期归档'>
							<Label>长期归档</Label>
							<ListBox.ItemIndicator />
						</ListBox.Item>
					</ListBox>
				</ComboBox.Popover>
			</ComboBox>
		</div>
	)
}

function SelectionControlsPreview() {
	const [isCompact, setIsCompact] = useState(false)
	const [partialSelection, setPartialSelection] = useState<boolean | 'mixed'>('mixed')

	return (
		<div className='grid w-full min-w-0 gap-6 lg:grid-cols-2'>
			<section aria-labelledby='checkbox-states-heading' className='min-w-0'>
				<h3 className='text-sm font-semibold' id='checkbox-states-heading'>
					Checkbox 状态
				</h3>
				<div className='mt-3 flex flex-col gap-3'>
					<Checkbox name='sync-reminders-primary' variant='primary'>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							Primary（白底浅阴影）
						</Checkbox.Content>
					</Checkbox>

					<Checkbox name='sync-reminders' variant='secondary'>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							Secondary（灰底无阴影）
						</Checkbox.Content>
						<Description>点击文字与控件都能切换。</Description>
					</Checkbox>

					<Checkbox defaultSelected name='completed-visible' variant='secondary'>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							显示已完成任务
						</Checkbox.Content>
					</Checkbox>

					<Checkbox
						isIndeterminate={partialSelection === 'mixed'}
						isSelected={partialSelection === true}
						name='partial-selection'
						onChange={setPartialSelection}
						variant='secondary'
					>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							部分项目已选择（半选）
						</Checkbox.Content>
					</Checkbox>

					<Checkbox isDisabled name='managed-policy' variant='secondary'>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							由组织策略管理
						</Checkbox.Content>
						<Description>禁用原因保持可见。</Description>
					</Checkbox>
				</div>
			</section>

			<section aria-labelledby='choice-states-heading' className='min-w-0'>
				<h3 className='text-sm font-semibold' id='choice-states-heading'>
					Radio / Switch / Toggle
				</h3>
				<div className='mt-3 flex flex-col gap-5'>
					<RadioGroup defaultValue='quiet' name='notification-level'>
						<Label>通知强度</Label>
						<Description>方向键在同一组内移动选择。</Description>
						<Radio value='quiet'>
							<Radio.Content>
								<Radio.Control>
									<Radio.Indicator />
								</Radio.Control>
								安静
							</Radio.Content>
						</Radio>
						<Radio value='standard'>
							<Radio.Content>
								<Radio.Control>
									<Radio.Indicator />
								</Radio.Control>
								标准
							</Radio.Content>
						</Radio>
						<Radio isDisabled value='urgent'>
							<Radio.Content>
								<Radio.Control>
									<Radio.Indicator />
								</Radio.Control>
								强提醒（当前不可用）
							</Radio.Content>
						</Radio>
					</RadioGroup>

					<Switch defaultSelected name='background-sync'>
						<Switch.Content>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							<Label>后台同步</Label>
						</Switch.Content>
						<Description>开关文字提供状态语义，不只看颜色。</Description>
					</Switch>

					<div>
						<ToggleButton isSelected={isCompact} onChange={setIsCompact} variant='ghost'>
							紧凑模式
						</ToggleButton>
						<p aria-live='polite' className='mt-2 text-xs text-muted'>
							当前状态：{isCompact ? '已开启紧凑模式' : '已关闭紧凑模式'}
						</p>
					</div>
				</div>
			</section>
		</div>
	)
}

type SaveStatus = 'idle' | 'pending' | 'error' | 'saved'

function SettingsFormPreview() {
	const [status, setStatus] = useState<SaveStatus>('idle')
	const [dangerMessage, setDangerMessage] = useState('')
	const saveTimer = useRef<number | null>(null)

	useEffect(
		() => () => {
			if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
		},
		[],
	)

	function scheduleSave(result: 'error' | 'saved') {
		if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
		setStatus('pending')
		saveTimer.current = window.setTimeout(() => {
			setStatus(result)
			saveTimer.current = null
		}, 600)
	}

	return (
		<Form
			className='flex w-full max-w-lg min-w-0 flex-col gap-3'
			onSubmit={(event) => {
				event.preventDefault()
				scheduleSave('error')
			}}
		>
			<p className='text-xs leading-5 text-muted'>
				这是无副作用 fixture：首次保存模拟失败，重试模拟成功，不写入真实设置。
			</p>

			<Card>
				<Card.Header>
					<Card.Title>基本信息</Card.Title>
					<Card.Description>检查分组、标签顺序、长中文和窄容器重排。</Card.Description>
				</Card.Header>
				<Card.Content>
					<div className='flex flex-col gap-4'>
						<TextField
							defaultValue='长期产品与体验规范整理'
							fullWidth
							isRequired
							name='display-name'
						>
							<Label>工作区显示名称（必填）</Label>
							<Input fullWidth />
							<Description>最多 40 个字符；此 fixture 不持久化。</Description>
						</TextField>

						<Switch defaultSelected name='restore-view'>
							<Switch.Content>
								<Switch.Control>
									<Switch.Thumb />
								</Switch.Control>
								<Label>在关闭窗口后仍保留尚未完成的筛选与视图偏好</Label>
							</Switch.Content>
							<Description>长标签应自然换行，点击文字仍能切换。</Description>
						</Switch>
					</div>
				</Card.Content>
			</Card>

			<Card>
				<Card.Header>
					<Card.Title>危险区</Card.Title>
					<Card.Description>危险操作保持低频、明确，并与常规保存分开。</Card.Description>
				</Card.Header>
				<Card.Content>
					<Button
						onPress={() => setDangerMessage('已模拟清除；没有数据被删除。')}
						type='button'
						variant='danger'
					>
						清除本地演示数据
					</Button>
					<p aria-live='polite' className='mt-2 text-xs text-muted'>
						{dangerMessage || '此按钮只更新当前预览中的提示。'}
					</p>
				</Card.Content>
			</Card>

			{status === 'error' ? (
				<Alert role='alert' status='danger'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>保存失败</Alert.Title>
						<Alert.Description>模拟连接中断，未写入任何设置；表单输入仍保留。</Alert.Description>
					</Alert.Content>
					<Button onPress={() => scheduleSave('saved')} type='button' variant='danger'>
						重试保存
					</Button>
				</Alert>
			) : null}

			<p aria-live='polite' className='min-h-5 text-sm text-muted' role='status'>
				{status === 'pending' ? '正在保存演示设置…' : null}
				{status === 'saved' ? '已保存演示设置；页面刷新后不会保留。' : null}
			</p>

			<div className='flex flex-wrap justify-end gap-2'>
				<Button type='reset' variant='ghost'>
					恢复表单默认值
				</Button>
				<Button isPending={status === 'pending'} type='submit' variant='primary'>
					{status === 'pending' ? <Spinner color='current' size='sm' /> : null}
					保存设置
				</Button>
			</div>
		</Form>
	)
}

export const TICKET_03_SAMPLES = [
	{
		id: 'stoneflow-field-states',
		name: 'Input / TextArea / SearchField',
		view: 'stoneflow',
		category: 'Fields',
		description: '用真实 HeroUI 字段审查空值、长中文、只读、禁用、无效、加载、清除与焦点差异。',
		keywords: ['input', 'textarea', 'searchfield', '输入框', '搜索', '只读', '校验', 'focus'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Empty、Filled、Disabled、Read-only、Loading、Invalid、Pointer / Keyboard Focus',
		verification: 'Lab 可验证；WebView 焦点仍需真实应用 smoke',
		Preview: FieldStatesPreview,
	},
	{
		id: 'stoneflow-composite-fields',
		name: 'NumberField / DateField / Select / ComboBox',
		view: 'stoneflow',
		category: 'Fields',
		description: '直接操作已安装的数字、日期与选择组件，观察分段输入、弹层、对齐和键盘路径。',
		keywords: ['numberfield', 'datefield', 'select', 'combobox', '数字', '日期', '选择器'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Rest、Open、Selected、Keyboard Navigation、Narrow',
		verification: 'Lab 可验证；Portal 与 WebView 边界仅真实应用验证',
		Preview: CompositeFieldsPreview,
	},
	{
		id: 'stoneflow-selection-controls',
		name: 'Checkbox / Radio / Switch / Toggle',
		view: 'stoneflow',
		category: 'Fields',
		description: '比较选择、未选、半选、禁用和键盘焦点，并用文字提供非颜色状态线索。',
		keywords: ['checkbox', 'radio', 'switch', 'toggle', '选择', '半选', '开关'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Selected、Unselected、Indeterminate、Disabled、Keyboard Focus',
		verification: 'Lab 可验证',
		Preview: SelectionControlsPreview,
	},
	{
		id: 'stoneflow-settings-form',
		name: 'Settings Form：保存与重试',
		view: 'stoneflow',
		category: 'Product Scenes',
		description: '最小无副作用设置场景，观察分组、保存 Pending、错误、重试、危险区和长文案。',
		keywords: ['settings', 'form', '设置表单', '保存', 'pending', '错误', '重试', '危险区'],
		owner: 'UI Lab fixture',
		source: 'src/ui-lab/samples/ticket-03/fieldsAndSettingsSamples.tsx',
		coverage: 'rendered',
		states: 'Rest、Pending、Error、Retry、Saved、Danger、Long Copy、Narrow',
		verification: 'Lab 可验证；真实持久化仅真实应用验证',
		Preview: SettingsFormPreview,
	},
] as const satisfies readonly UiLabSample[]
