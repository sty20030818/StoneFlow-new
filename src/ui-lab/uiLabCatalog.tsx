import { useState, type ComponentType } from 'react'

import { Button } from '@heroui/react'

import { TICKET_02_SAMPLES } from './samples/ticket-02/ticket02Samples'
import { TICKET_03_SAMPLES } from './samples/ticket-03/fieldsAndSettingsSamples'
import { TICKET_04_SAMPLES } from './samples/ticket-04/navigationSamples'

export type UiLabViewId = 'stoneflow' | 'heroui'

export type UiLabSample = {
	id: string
	name: string
	view: UiLabViewId
	category: string
	description: string
	keywords: readonly string[]
	owner: string
	states: string
	verification: string
	Preview: ComponentType
}

export const UI_LAB_VIEWS = [
	{
		id: 'stoneflow' as const,
		label: 'StoneFlow',
		purpose: '审查当前产品界面的目标基线',
		categories: [
			'Foundations',
			'Actions',
			'Fields',
			'Navigation',
			'Collections',
			'Feedback',
			'Overlays',
			'Product Scenes',
		],
		defaultCategory: 'Actions',
	},
	{
		id: 'heroui' as const,
		label: 'HeroUI',
		purpose: '在 StoneFlow 主题中评估上游能力',
		categories: ['已采用', '替换候选', '探索中'],
		defaultCategory: '已采用',
	},
] as const

function HeroUIButtonPreview() {
	const [presses, setPresses] = useState(0)
	return (
		<div className='flex flex-col items-start gap-3'>
			<h2 className='text-base font-semibold'>HeroUI Button</h2>
			<Button onPress={() => setPresses((count) => count + 1)} type='button' variant='secondary'>
				验证组件
			</Button>
			<p aria-live='polite' className='text-sm text-muted'>
				已触发 {presses} 次
			</p>
		</div>
	)
}

export const UI_LAB_SAMPLES: readonly UiLabSample[] = [
	...TICKET_02_SAMPLES,
	{
		id: 'heroui-button',
		name: 'HeroUI Button',
		view: 'heroui',
		category: '已采用',
		description: '在 StoneFlow 实际主题中检查项目已采用的 HeroUI 标准按钮。',
		keywords: ['button', '按钮', 'heroui', '已采用'],
		owner: 'HeroUI OSS',
		states: 'Rest、Hover、Pressed、Keyboard Focus',
		verification: 'Lab 可验证',
		Preview: HeroUIButtonPreview,
	},
	...TICKET_03_SAMPLES,
	...TICKET_04_SAMPLES,
]
