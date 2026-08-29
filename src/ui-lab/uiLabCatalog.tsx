import type { ComponentType } from 'react'

import { TICKET_02_SAMPLES } from './samples/ticket-02/ticket02Samples'
import { TICKET_03_SAMPLES } from './samples/ticket-03/fieldsAndSettingsSamples'
import { TICKET_04_SAMPLES } from './samples/ticket-04/navigationSamples'
import { TICKET_05_SAMPLES } from './samples/ticket-05/collectionsAndTaskSamples'
import { TICKET_06_SAMPLES } from './samples/ticket-06/feedbackLauncherSamples'
import { TICKET_07_SAMPLES } from './samples/ticket-07/overlaySamples'
import { TICKET_08_SAMPLES } from './samples/ticket-08/herouiCandidateSamples'

export type UiLabViewId = 'stoneflow' | 'heroui'
export type UiLabCoverage = 'rendered' | 'missing' | 'real-app-only' | 'ledger-only'
export type UiLabDisposition = 'keep' | 'simplify' | 'candidate' | 'real-app-only'
export type UiLabAdoptionStatus = 'used' | 'candidate' | 'no-current-scenario'
export type UiLabReviewStatus = 'done' | 'pending' | 'external'
export type UiLabReviewBatchId =
	| 'batch-01'
	| 'batch-02'
	| 'batch-03'
	| 'batch-04'
	| 'batch-05'
	| 'batch-06'
	| 'batch-07'
	| 'batch-08'

export type UiLabReviewEntry = {
	sampleId: string
	role: 'target' | 'reference'
	status: UiLabReviewStatus
}

export type UiLabReviewBatch = {
	id: UiLabReviewBatchId
	label: string
	title: string
	objective: string
	entries: readonly UiLabReviewEntry[]
}

type UiLabCatalogEntryBase = {
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

export type UiLabReviewUnitInput =
	| (UiLabCatalogEntryBase & { coverage: 'rendered'; Preview: ComponentType; reason?: never })
	| (UiLabCatalogEntryBase & {
			coverage: 'missing' | 'real-app-only'
			reason: string
			Preview?: never
	  })

type UiLabInventoryMetadata = {
	recommendedOwner: string | null
	disposition: UiLabDisposition | null
	consumers: readonly string[] | null
	compositionParent: string | null
	adoption: UiLabAdoptionStatus | null
}

export type UiLabCatalogEntry =
	| (UiLabReviewUnitInput & UiLabInventoryMetadata & { entryKind: 'review-unit' })
	| (UiLabCatalogEntryBase &
			UiLabInventoryMetadata & {
				entryKind: 'ledger-only'
				coverage: 'ledger-only'
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

const UI_LAB_REVIEW_UNITS = [
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
] satisfies readonly UiLabReviewUnitInput[]

export const UI_LAB_CATALOG: readonly UiLabCatalogEntry[] = [
	...UI_LAB_REVIEW_UNITS.map((entry) => ({
		...entry,
		entryKind: 'review-unit' as const,
		recommendedOwner: null,
		disposition: entry.coverage === 'real-app-only' ? ('real-app-only' as const) : null,
		consumers: null,
		compositionParent: null,
		adoption: null,
	})),
	{
		id: 'heroui-color-swatch-picker-ledger',
		name: 'HeroUI ColorSwatchPicker',
		view: 'heroui',
		category: '已采用',
		description: '登记 Space Editor 已使用的 HeroUI 颜色选择器；当前不为目录完整度复制生产预览。',
		keywords: ['color', 'swatch', 'picker', '颜色', '空间编辑'],
		owner: 'Upstream',
		recommendedOwner: 'Upstream',
		disposition: 'keep',
		consumers: ['src/features/space/components/SpaceEditorDialog.tsx'],
		compositionParent: 'Space Editor',
		adoption: 'used',
		source: '@heroui/react@3.2.4',
		entryKind: 'ledger-only',
		coverage: 'ledger-only',
		states: 'Selected、Disabled、Keyboard Focus',
		verification: '生产使用已由静态源码确认；独立视觉尚未在 Lab 审查',
		reason: '该能力已在 Space Editor 组合中使用；独立原生对照由后续审查批次补充。',
	},
]

export const UI_LAB_REVIEW_BATCHES: readonly UiLabReviewBatch[] = [
	{
		id: 'batch-01',
		label: '第一批',
		title: '基础与动作',
		objective: '确认语义颜色、排版、几何、动作层级、Toolbar 与 Link 的目标基线。',
		entries: [
			{ sampleId: 'foundations-color-typography', role: 'target', status: 'done' },
			{ sampleId: 'foundations-geometry', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-button', role: 'target', status: 'done' },
			{ sampleId: 'actions-groups-toolbar', role: 'target', status: 'done' },
			{ sampleId: 'actions-link-semantics', role: 'target', status: 'done' },
			{ sampleId: 'heroui-button', role: 'reference', status: 'done' },
		],
	},
	{
		id: 'batch-02',
		label: '第二批',
		title: '表单与选择',
		objective: '检查复合 Field、框中框、选择控件、半选行为与 Pointer/Keyboard Focus。',
		entries: [
			{ sampleId: 'stoneflow-field-states', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-composite-fields', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-selection-controls', role: 'target', status: 'done' },
			{ sampleId: 'heroui-input', role: 'reference', status: 'done' },
			{ sampleId: 'heroui-select', role: 'reference', status: 'done' },
			{ sampleId: 'heroui-search-field-candidate', role: 'reference', status: 'done' },
			{ sampleId: 'heroui-date-picker-candidate', role: 'reference', status: 'done' },
		],
	},
	{
		id: 'batch-03',
		label: '第三批',
		title: '导航',
		objective: '确认 Breadcrumb、Sidebar、Tabs、Pagination、Command 与 Settings Navigation。',
		entries: [
			{ sampleId: 'stoneflow-breadcrumb', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-sidebar-density', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-tabs', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-pagination', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-command-navigation', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-settings-navigation', role: 'target', status: 'done' },
			{ sampleId: 'heroui-breadcrumbs', role: 'reference', status: 'done' },
		],
	},
	{
		id: 'batch-04',
		label: '第四批',
		title: '集合与任务行',
		objective: '确认集合键盘路径、Menu、ListBox/ListView、Task Row 与 Group Header。',
		entries: [
			{ sampleId: 'stoneflow-row-shell', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-menu', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-list-box', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-list-view', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-task-row', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-group-header', role: 'target', status: 'done' },
			{ sampleId: 'heroui-list-view', role: 'reference', status: 'done' },
		],
	},
	{
		id: 'batch-05',
		label: '第五批',
		title: '元数据与 Task Board',
		objective: '检查紧凑元数据、溢出、可移除状态和 Task Board 组合密度。',
		entries: [
			{ sampleId: 'stoneflow-table', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-tag', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-chip', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-badge', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-avatar', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-task-board', role: 'target', status: 'done' },
		],
	},
	{
		id: 'batch-06',
		label: '第六批',
		title: '反馈与 Launcher',
		objective: '检查空、加载、错误、恢复、Toast 生命周期和 Launcher 可移植视觉。',
		entries: [
			{ sampleId: 'stoneflow-empty-error-recovery', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-loading-feedback', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-alert-toast', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-semantic-feedback', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-launcher-lifecycle', role: 'target', status: 'done' },
			{ sampleId: 'heroui-empty-state', role: 'reference', status: 'done' },
		],
	},
	{
		id: 'batch-07',
		label: '第七批',
		title: '浮层与焦点',
		objective: '检查打开、初始焦点、Tab、Escape、焦点恢复、Danger 与 Portal 生命周期。',
		entries: [
			{ sampleId: 'stoneflow-tooltip', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-dropdown', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-popover', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-context-menu', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-modal', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-alert-dialog', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-sheet', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-task-detail-focus', role: 'target', status: 'done' },
			{ sampleId: 'heroui-tooltip', role: 'reference', status: 'done' },
			{ sampleId: 'heroui-modal', role: 'reference', status: 'done' },
		],
	},
	{
		id: 'batch-08',
		label: '第八批',
		title: '组合与桌面边界',
		objective: '检查组件组合后的层级与几何，并把桌面专属行为转交真实 Tauri 验收。',
		entries: [
			{ sampleId: 'page-frame-scene', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-settings-form', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-shell-sidebar-scene', role: 'target', status: 'done' },
			{ sampleId: 'stoneflow-main-launcher-real-app', role: 'target', status: 'external' },
		],
	},
]

export function reviewBatchForEntry(entryId: string) {
	return UI_LAB_REVIEW_BATCHES.find((batch) =>
		batch.entries.some((entry) => entry.sampleId === entryId),
	)
}

export function reviewEntryForEntry(entryId: string) {
	return reviewBatchForEntry(entryId)?.entries.find((entry) => entry.sampleId === entryId)
}
