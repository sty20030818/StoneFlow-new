import { Button } from '@heroui/react'
import { useState, type ComponentProps } from 'react'

import { DisplayOptionsPopover } from '@/features/display-options'
import type { UiLabReviewUnitInput } from '../uiLabCatalog'

type DisplayOptions = ComponentProps<typeof DisplayOptionsPopover>['options']
const INITIAL_OPTIONS: DisplayOptions = {
	groupBy: 'none',
	subGroupBy: 'none',
	orderBy: 'manual',
	orderDirection: 'asc',
	completedOrder: 'recency',
	showEmptyGroups: false,
	visibleProperties: ['status', 'priority', 'dueAt'],
}

function DisplayOrderingPreview() {
	const [options, setOptions] = useState(INITIAL_OPTIONS)
	const [defaults, setDefaults] = useState(INITIAL_OPTIONS)
	const [open, setOpen] = useState(false)
	const applyPartial = async (patch: Partial<DisplayOptions>) =>
		setOptions((current) => ({ ...current, ...patch }))
	return (
		<div className='flex w-full min-w-0 max-w-xl flex-col gap-3'>
			<p className='text-sm text-muted'>
				项目详情显示面板：切换手动、智能和字段排序，检查方向、完成项说明与键盘操作。所有选项只保存在样例内存，不执行任务查询或写入显示偏好。
			</p>
			<div className='flex justify-end'>
				<DisplayOptionsPopover
					pageKey='task:project-detail'
					options={options}
					status='ready'
					open={open}
					onOpenChange={setOpen}
					trigger={
						<Button aria-label='显示选项' variant='outline'>
							显示选项
						</Button>
					}
					actions={{
						applyPartial,
						setGrouping: (groupBy) => applyPartial({ groupBy }),
						setSubGrouping: (subGroupBy) => applyPartial({ subGroupBy }),
						setOrdering: (orderBy, orderDirection) =>
							applyPartial({ orderBy, orderDirection: orderDirection ?? options.orderDirection }),
						setCompletedOrder: (completedOrder) => applyPartial({ completedOrder }),
						setVisibleProperties: (visibleProperties) => applyPartial({ visibleProperties }),
						setAsDefault: async () => setDefaults(options),
						resetToDefault: async () => setOptions(defaults),
					}}
				/>
			</div>
		</div>
	)
}

export const DISPLAY_ORDERING_SAMPLES: readonly UiLabReviewUnitInput[] = [
	{
		id: 'stoneflow-display-ordering',
		name: '显示选项 · 完整结果排序',
		view: 'stoneflow',
		category: 'Product Scenes',
		owner: 'Product',
		recommendedOwner: 'Product',
		disposition: 'keep',
		description:
			'真实生产 Display 浮层与面板，检查排序意图、固定方向和完成项文案；受控回调仅更新样例内存。',
		keywords: ['display', '显示选项', '排序', 'manual', 'smart', 'priority', '完成项', '方向'],
		source:
			'src/features/display-options/components/DisplayOptionsPopover.tsx；src/features/display-options/components/DisplayOptionsPanel.tsx',
		states: '手动 / 智能 / 字段排序 / 升降序 / 完成项置底 / 键盘 / 窄窗口',
		verification:
			'受控生产组件，无任务查询、IPC、数据库或 localStorage 写入；完整结果排序由真实页面与仓储测试验证。',
		inventoryRefs: [
			'stoneflow-component-display-options-popover',
			'stoneflow-component-display-options-panel',
		],
		coverage: 'rendered',
		Preview: DisplayOrderingPreview,
	},
]
