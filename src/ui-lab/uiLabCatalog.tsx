import type { ComponentType } from 'react'

import { TICKET_02_SAMPLES } from './samples/ticket-02/ticket02Samples'
import { TICKET_03_SAMPLES } from './samples/ticket-03/fieldsAndSettingsSamples'
import { TICKET_04_SAMPLES } from './samples/ticket-04/navigationSamples'
import { TICKET_05_SAMPLES } from './samples/ticket-05/collectionsAndTaskSamples'
import { TICKET_06_SAMPLES } from './samples/ticket-06/feedbackLauncherSamples'
import { TICKET_07_SAMPLES } from './samples/ticket-07/overlaySamples'
import { TICKET_08_SAMPLES } from './samples/ticket-08/herouiCandidateSamples'

export type UiLabViewId = 'stoneflow' | 'heroui'
export type UiLabCoverage = 'rendered' | 'missing' | 'real-app-only'

type UiLabSampleBase = {
	id: string
	name: string
	view: UiLabViewId
	category: string
	description: string
	keywords: readonly string[]
	owner: string
	source: string
	states: string
	verification: string
}

export type UiLabSample =
	| (UiLabSampleBase & { coverage: 'rendered'; Preview: ComponentType; reason?: never })
	| (UiLabSampleBase & {
			coverage: 'missing' | 'real-app-only'
			reason: string
			Preview?: never
	  })

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
	...TICKET_05_SAMPLES,
	...TICKET_06_SAMPLES,
	...TICKET_07_SAMPLES,
	...TICKET_08_SAMPLES,
	{
		id: 'stoneflow-main-launcher-real-app',
		name: 'Main / Launcher 原生窗口验收',
		view: 'stoneflow',
		category: 'Product Scenes',
		description: '统一登记无法由浏览器 Lab 代签的桌面窗口行为，不复制 Main 或 Launcher 运行时。',
		keywords: ['main', 'launcher', 'portal', 'webview', '窗口', '缩放', '跨窗口'],
		owner: 'Desktop shell',
		source: 'src/main.tsx；src/launcher.tsx；src-tauri/tauri.conf.json',
		coverage: 'real-app-only',
		states: 'Portal、WebView 激活、窗口断点、缩放、跨窗口一致性',
		verification: '统一产品验收；UI Lab 不代签',
		reason:
			'Portal 归属、WebView 激活、窗口断点、缩放与跨窗口一致性依赖真实 Tauri Main / Launcher 窗口，不能在浏览器 UI Lab 中可靠复现。',
	},
]
