import type { ComponentType } from 'react'

import { TICKET_02_SAMPLES } from './samples/ticket-02/ticket02Samples'
import { TICKET_03_SAMPLES } from './samples/ticket-03/fieldsAndSettingsSamples'
import { TICKET_04_SAMPLES } from './samples/ticket-04/navigationSamples'
import { TICKET_08_SAMPLES } from './samples/ticket-08/herouiCandidateSamples'

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

export const UI_LAB_SAMPLES: readonly UiLabSample[] = [
	...TICKET_02_SAMPLES,
	...TICKET_03_SAMPLES,
	...TICKET_04_SAMPLES,
	...TICKET_08_SAMPLES,
]
