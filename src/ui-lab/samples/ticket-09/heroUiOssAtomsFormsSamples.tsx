import type { ReactNode } from 'react'

import { CalendarDate } from '@internationalized/date'
import {
	Autocomplete,
	Avatar,
	Button,
	Calendar,
	Checkbox,
	Chip,
	ColorSwatchPicker,
	ComboBox,
	Description,
	FieldError,
	Form,
	Input,
	Kbd,
	Label,
	ListBox,
	NumberField,
	Radio,
	RadioGroup,
	SearchField,
	Select,
	Separator,
	Switch,
	TextArea,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Toolbar,
	useFilter,
} from '@heroui/react'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'

function Fixture({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className='flex min-w-0 flex-col gap-4 font-sans'>
			<h3 className='text-base font-semibold'>{title}</h3>
			{children}
			<p className='text-xs leading-5 text-muted'>
				用指针与键盘操作真实公共状态；Lab 不叠加状态样式。
			</p>
		</div>
	)
}

function ActionsFixture() {
	return (
		<Fixture title='Actions'>
			<Toolbar aria-label='原子动作对照' className='flex flex-wrap gap-2'>
				<Button type='button'>主要操作</Button>
				<Button type='button' variant='secondary'>
					次要操作
				</Button>
				<ToggleButtonGroup
					aria-label='显示密度'
					defaultSelectedKeys={['comfortable']}
					disallowEmptySelection
					selectionMode='single'
				>
					<ToggleButton id='compact'>紧凑</ToggleButton>
					<ToggleButton id='comfortable'>
						<ToggleButtonGroup.Separator />
						舒适
					</ToggleButton>
					<ToggleButton id='wide' isDisabled>
						<ToggleButtonGroup.Separator />
						宽松
					</ToggleButton>
				</ToggleButtonGroup>
			</Toolbar>
		</Fixture>
	)
}

function TextFieldsFixture() {
	return (
		<Fixture title='Text Fields'>
			<Form
				className='grid min-w-0 gap-4 sm:grid-cols-2'
				onSubmit={(event) => event.preventDefault()}
			>
				<TextField fullWidth name='native-title'>
					<Label>任务标题</Label>
					<Input defaultValue='整理原生组件归属' fullWidth />
					<Description>标签、说明和输入共享字段语义。</Description>
				</TextField>
				<TextField fullWidth isInvalid name='native-required'>
					<Label>必填名称</Label>
					<Input fullWidth />
					<FieldError>请输入名称。</FieldError>
				</TextField>
				<TextField className='sm:col-span-2' fullWidth name='native-note'>
					<Label>说明</Label>
					<TextArea defaultValue='这是一段用于观察窄宽换行的无副作用长中文。' fullWidth rows={3} />
				</TextField>
				<div className='justify-self-start'>
					<Button type='submit'>保存</Button>
				</div>
			</Form>
		</Fixture>
	)
}

function SearchFieldFixture() {
	return (
		<Fixture title='SearchField'>
			<div className='grid min-w-0 gap-4 sm:grid-cols-2'>
				<SearchField defaultValue='同步' fullWidth name='global-search' variant='secondary'>
					<Label>Global Search</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder='搜索任务与项目' />
						<SearchField.ClearButton aria-label='清空全局搜索' />
					</SearchField.Group>
					<Description>对应全局搜索输入。</Description>
				</SearchField>
				<SearchField fullWidth name='filter-search' variant='secondary'>
					<Label>Filter</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder='筛选属性值' />
						<SearchField.ClearButton aria-label='清空筛选搜索' />
					</SearchField.Group>
					<Description>对应筛选菜单内搜索。</Description>
				</SearchField>
			</div>
		</Fixture>
	)
}

function NumberFieldFixture() {
	return (
		<Fixture title='NumberField'>
			<NumberField
				className='max-w-xs'
				defaultValue={15}
				maxValue={1440}
				minValue={1}
				name='sync-interval'
				step={1}
				variant='secondary'
			>
				<Label>同步间隔（分钟）</Label>
				<div className='flex items-center gap-2'>
					<NumberField.Group className='w-40'>
						<NumberField.DecrementButton aria-label='减少同步间隔' />
						<NumberField.Input />
						<NumberField.IncrementButton aria-label='增加同步间隔' />
					</NumberField.Group>
					<span className='text-sm text-muted'>分钟</span>
				</div>
				<Description>可填 1–1440，精确到 1 分钟。</Description>
			</NumberField>
		</Fixture>
	)
}

function ChoiceControlsFixture() {
	return (
		<Fixture title='Choice Controls'>
			<div className='grid min-w-0 gap-5 sm:grid-cols-2'>
				<div className='flex flex-col gap-3'>
					<Checkbox defaultSelected name='show-completed'>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							显示已完成任务
						</Checkbox.Content>
					</Checkbox>
					<Checkbox isDisabled name='managed-choice'>
						<Checkbox.Content>
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
							由组织策略管理
						</Checkbox.Content>
					</Checkbox>
					<Switch defaultSelected name='background-sync'>
						<Switch.Content>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							<Label>后台同步</Label>
						</Switch.Content>
					</Switch>
				</div>
				<RadioGroup defaultValue='interval' name='sync-policy'>
					<Label>同步策略</Label>
					<Radio value='realtime'>
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							实时
						</Radio.Content>
					</Radio>
					<Radio value='interval'>
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							定时
						</Radio.Content>
					</Radio>
				</RadioGroup>
			</div>
		</Fixture>
	)
}

function SelectListBoxFixture() {
	return (
		<Fixture title='Select / ListBox'>
			<div className='grid min-w-0 gap-4 sm:grid-cols-2'>
				<Select defaultValue='daily' fullWidth name='review-frequency'>
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
							<ListBox.Item id='managed' isDisabled textValue='由管理员决定'>
								<Label>由管理员决定</Label>
							</ListBox.Item>
						</ListBox>
					</Select.Popover>
				</Select>
				<ListBox aria-label='审查范围' defaultSelectedKeys={['review']} selectionMode='single'>
					<ListBox.Item id='all' textValue='所有组件'>
						<Label>所有组件</Label>
						<ListBox.ItemIndicator />
					</ListBox.Item>
					<ListBox.Item id='review' textValue='当前待审核组件'>
						<Label>当前待审核组件与一段较长中文名称</Label>
						<ListBox.ItemIndicator />
					</ListBox.Item>
					<ListBox.Item id='archived' isDisabled textValue='已归档组件'>
						<Label>已归档组件</Label>
					</ListBox.Item>
				</ListBox>
			</div>
		</Fixture>
	)
}

// Lab 快照只用于对照锁定版本的可搜索原语；生产字段事实仍由 FilterMenu 持有。
const FILTER_FIELD_SNAPSHOT = [
	{ id: 'status', name: '状态' },
	{ id: 'priority', name: '优先级' },
	{ id: 'project', name: '项目' },
	{ id: 'due', name: '截止时间' },
	{ id: 'planned', name: '计划时间' },
] as const

function ComboBoxAutocompleteFixture() {
	const { contains } = useFilter({ sensitivity: 'base' })
	return (
		<Fixture title='ComboBox / Autocomplete'>
			<div className='grid min-w-0 gap-4 sm:grid-cols-2'>
				<ComboBox defaultValue='priority' fullWidth menuTrigger='input' name='property'>
					<Label>属性</Label>
					<ComboBox.InputGroup>
						<Input placeholder='搜索属性' />
						<ComboBox.Trigger aria-label='展开属性' />
					</ComboBox.InputGroup>
					<ComboBox.Popover>
						<ListBox>
							{FILTER_FIELD_SNAPSHOT.map((item) => (
								<ListBox.Item id={item.id} key={item.id} textValue={item.name}>
									<Label>{item.name}</Label>
									<ListBox.ItemIndicator />
								</ListBox.Item>
							))}
						</ListBox>
					</ComboBox.Popover>
				</ComboBox>
				<Autocomplete defaultValue='status' fullWidth placeholder='选择属性' selectionMode='single'>
					<Label>可搜索属性候选</Label>
					<Autocomplete.Trigger>
						<Autocomplete.Value />
						<Autocomplete.ClearButton />
						<Autocomplete.Indicator />
					</Autocomplete.Trigger>
					<Autocomplete.Popover>
						<Autocomplete.Filter filter={contains}>
							<SearchField autoFocus aria-label='搜索属性候选' name='property-filter'>
								<SearchField.Group>
									<SearchField.SearchIcon />
									<SearchField.Input placeholder='搜索属性' />
									<SearchField.ClearButton />
								</SearchField.Group>
							</SearchField>
							<ListBox>
								{FILTER_FIELD_SNAPSHOT.map((item) => (
									<ListBox.Item id={item.id} key={item.id} textValue={item.name}>
										<Label>{item.name}</Label>
										<ListBox.ItemIndicator />
									</ListBox.Item>
								))}
							</ListBox>
						</Autocomplete.Filter>
					</Autocomplete.Popover>
				</Autocomplete>
			</div>
		</Fixture>
	)
}

const SPACE_COLORS = [
	{ id: 'blue', label: '蓝色', value: '#3f7ad6' },
	{ id: 'green', label: '绿色', value: '#2da44e' },
	{ id: 'amber', label: '琥珀', value: '#e58a00' },
] as const

function DateColorFixture() {
	return (
		<Fixture title='Date / Calendar / ColorSwatchPicker'>
			<div className='grid min-w-0 gap-5 lg:grid-cols-2'>
				<Calendar aria-label='审查日期' defaultValue={new CalendarDate(2026, 8, 30)}>
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
				<div className='flex flex-col gap-2'>
					<Label>空间颜色</Label>
					<ColorSwatchPicker aria-label='空间颜色' defaultValue='#3f7ad6'>
						{SPACE_COLORS.map((color) => (
							<ColorSwatchPicker.Item aria-label={color.label} color={color.value} key={color.id}>
								<ColorSwatchPicker.Swatch />
								<ColorSwatchPicker.Indicator />
							</ColorSwatchPicker.Item>
						))}
					</ColorSwatchPicker>
					<Description>完整 Space Editor 留在产品组件批次。</Description>
				</div>
			</div>
		</Fixture>
	)
}

function CompactMetadataFixture() {
	return (
		<Fixture title='Compact Metadata'>
			<div className='flex flex-wrap items-center gap-2'>
				<Avatar size='md'>
					<Avatar.Image alt='石头鱼' src='/avatar.jpg' />
					<Avatar.Fallback>石</Avatar.Fallback>
				</Avatar>
				<Chip size='lg' variant='secondary'>
					<Chip.Label>界面审查</Chip.Label>
				</Chip>
				<Separator className='h-5' orientation='vertical' />
				<span className='text-sm'>打开命令</span>
				<Kbd variant='light'>
					<Kbd.Content>⌘ K</Kbd.Content>
				</Kbd>
			</div>
		</Fixture>
	)
}

export const TICKET_09_NATIVE_FIXTURES = {
	'oss-actions': { label: 'Actions', Preview: ActionsFixture },
	'oss-text-fields': { label: 'Text Fields', Preview: TextFieldsFixture },
	'oss-search-field': { label: 'SearchField', Preview: SearchFieldFixture },
	'oss-number-field': { label: 'NumberField', Preview: NumberFieldFixture },
	'oss-choice-controls': { label: 'Choice Controls', Preview: ChoiceControlsFixture },
	'oss-select-listbox': { label: 'Select / ListBox', Preview: SelectListBoxFixture },
	'oss-combobox-autocomplete': {
		label: 'ComboBox / Autocomplete',
		Preview: ComboBoxAutocompleteFixture,
	},
	'oss-date-color': { label: 'Date / Calendar / ColorSwatchPicker', Preview: DateColorFixture },
	'oss-compact-metadata': { label: 'Compact Metadata', Preview: CompactMetadataFixture },
} as const

export const TICKET_09_SAMPLES = [
	{
		id: 'heroui-oss-actions-review',
		name: 'Actions',
		view: 'heroui',
		category: '已采用',
		description: '核对 Button、ToggleButton、ToggleButtonGroup 与 Toolbar 的上游状态和主题归属。',
		keywords: ['button', 'toggle', 'toolbar', '动作'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-actions',
		states: 'Default、Hover、Pressed、Selected、Focus-visible、Disabled',
		verification: '三层同 fixture；Current 沿用第一批已确认视觉',
		disposition: 'keep',
		inventoryRefs: [
			'heroui-button',
			'heroui-oss-toggle-button',
			'heroui-oss-toggle-button-group',
			'heroui-oss-toolbar',
		],
	},
	{
		id: 'heroui-oss-text-fields-review',
		name: 'Text Fields',
		view: 'heroui',
		category: '已采用',
		description:
			'核对 Form、TextField、Input、TextArea、Label、Description 与 FieldError 的字段语义。',
		keywords: ['form', 'textfield', 'input', 'textarea', '表单'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-text-fields',
		states: 'Default、Filled、Invalid、Focus-visible、长中文、窄宽度',
		verification: '三层同 fixture；Current 沿用第二批已确认视觉',
		disposition: 'keep',
		inventoryRefs: [
			'heroui-oss-form',
			'heroui-oss-textfield',
			'heroui-input',
			'heroui-oss-textarea',
			'heroui-oss-label',
			'heroui-oss-description',
			'heroui-oss-field-error',
		],
	},
	{
		id: 'heroui-oss-search-field-review',
		name: 'SearchField',
		view: 'heroui',
		category: '已采用',
		description: '使用 Global Search 与 Filter 两类真实语义核对 SearchField。',
		keywords: ['search', 'global search', 'filter', '搜索'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-search-field',
		states: 'Empty、Filled、Clear、Focus-visible、窄宽度',
		verification: '三层同 fixture；真实查询与快捷键留给产品场景',
		disposition: 'keep',
		inventoryRefs: ['heroui-search-field-candidate'],
	},
	{
		id: 'heroui-oss-number-field-review',
		name: 'NumberField',
		view: 'heroui',
		category: '已采用',
		description: '以同步间隔的真实配置语义核对输入、步进、边界和键盘合同。',
		keywords: ['number', 'sync interval', '同步间隔', '设置'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-number-field',
		states: 'Filled、Increment、Decrement、Focus-visible、Min、Max',
		verification: '三层同 fixture；不写入真实同步设置',
		disposition: 'keep',
		inventoryRefs: ['heroui-oss-number-field'],
	},
	{
		id: 'heroui-oss-choice-controls-review',
		name: 'Choice Controls',
		view: 'heroui',
		category: '已采用',
		description: '核对 Checkbox、Radio、RadioGroup 与 Switch 的公共选择和禁用状态。',
		keywords: ['checkbox', 'radio', 'switch', '选择控件'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-choice-controls',
		states: 'Default、Selected、Focus-visible、Disabled',
		verification: '三层同 fixture；不伪造 Focus、动画或半选状态机',
		disposition: 'keep',
		inventoryRefs: [
			'heroui-oss-checkbox',
			'heroui-oss-radio',
			'heroui-oss-radio-group',
			'heroui-oss-switch',
		],
	},
	{
		id: 'heroui-oss-select-listbox-review',
		name: 'Select / ListBox',
		view: 'heroui',
		category: '已采用',
		description: '核对固定小集合的单选、禁用、长值和键盘路径。',
		keywords: ['select', 'listbox', '单选', '键盘'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-select-listbox',
		states: 'Closed、Open、Selected、Disabled、长中文、Focus-visible',
		verification: '三层同 fixture；真实数据来源留给产品场景',
		disposition: 'keep',
		inventoryRefs: ['heroui-select', 'heroui-oss-list-box'],
	},
	{
		id: 'heroui-oss-combobox-autocomplete-review',
		name: 'ComboBox / Autocomplete',
		view: 'heroui',
		category: '替换候选',
		description: '核对锁定版公共可搜索选择能力，作为 Metadata 属性菜单候选。',
		keywords: ['combobox', 'autocomplete', 'metadata', '属性菜单'],
		owner: 'Upstream',
		recommendedOwner: 'Upstream',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-combobox-autocomplete',
		states: 'Closed、Open、Filter、Selected、Clear、Keyboard Navigation',
		verification: '三层同 fixture；候选不代表生产迁移获批',
		disposition: 'candidate',
		inventoryRefs: ['heroui-oss-combo-box', 'heroui-oss-autocomplete'],
	},
	{
		id: 'heroui-oss-date-color-review',
		name: 'Date / Calendar / ColorSwatchPicker',
		view: 'heroui',
		category: '已采用',
		description: '核对生产 Calendar 日期组合与 Space 颜色选择所使用的上游原料。',
		keywords: ['date', 'calendar', 'color swatch', '日期', '空间颜色'],
		owner: 'Token',
		recommendedOwner: 'Token',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-date-color',
		states: 'Selected Date、Month Navigation、Selected Color、Focus-visible',
		verification: '三层同 fixture；完整 Space Editor 留给第十一批',
		disposition: 'keep',
		inventoryRefs: [
			'heroui-oss-date-field',
			'heroui-date-picker-candidate',
			'heroui-oss-calendar',
			'heroui-color-swatch-picker-ledger',
		],
	},
	{
		id: 'heroui-oss-compact-metadata-review',
		name: 'Compact Metadata',
		view: 'heroui',
		category: '已采用',
		description: '核对 Chip、Avatar、Kbd 与 Separator 在紧凑元数据中的原生尺寸和结构。',
		keywords: ['chip', 'avatar', 'kbd', 'separator', '元数据'],
		owner: 'Recipe',
		recommendedOwner: 'Recipe',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		comparisonFixture: 'oss-compact-metadata',
		states: 'Default、Fallback、长中文、窄宽度',
		verification: '三层同 fixture；Current 沿用第五批已确认视觉',
		disposition: 'keep',
		inventoryRefs: [
			'heroui-oss-chip',
			'heroui-oss-avatar',
			'heroui-oss-kbd',
			'heroui-oss-separator',
		],
	},
] satisfies readonly UiLabReviewUnitInput[]
