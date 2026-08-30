import type { ComponentType } from 'react'

import { HEROUI_REGISTRATIONS, type HeroUIRegistration } from './catalog/heroUiRegistrations'
import {
	STONEFLOW_CATALOG_REGISTRATIONS,
	type StoneFlowCatalogRegistration,
} from './catalog/stoneFlowRegistrations'
import type { NativeComparisonFixtureId } from './native-comparison/nativeComparisonContract'
import { TICKET_02_SAMPLES } from './samples/ticket-02/ticket02Samples'
import { TICKET_03_SAMPLES } from './samples/ticket-03/fieldsAndSettingsSamples'
import { TICKET_04_SAMPLES } from './samples/ticket-04/navigationSamples'
import { TICKET_05_SAMPLES } from './samples/ticket-05/collectionsAndTaskSamples'
import { TICKET_06_SAMPLES } from './samples/ticket-06/feedbackLauncherSamples'
import { TICKET_07_SAMPLES } from './samples/ticket-07/overlaySamples'
import { TICKET_08_SAMPLES } from './samples/ticket-08/herouiCandidateSamples'
import { TICKET_09_SAMPLES } from './samples/ticket-09/heroUiOssAtomsFormsSamples'
import { TICKET_10_SAMPLES } from './samples/ticket-10/heroUiComplexControlsSamples'
import { TICKET_11_SAMPLES } from './samples/ticket-11/stoneFlowSharedComponentsSamples'
import { TICKET_12_SAMPLES } from './samples/ticket-12/taskCollectionCompositionSamples'

export type UiLabViewId = 'stoneflow' | 'heroui'
export type UiLabCoverage =
	| 'rendered'
	| 'missing'
	| 'covered-in-composition'
	| 'upstream-no-override'
	| 'candidate'
	| 'real-app-only'
export type UiLabCapabilityKind = 'component' | 'function' | 'type' | 'product-scene'
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
	| 'batch-09'
	| 'batch-10'
	| 'batch-11'
	| 'batch-12'

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
	inventoryRefs?: readonly string[]
	ingredients?: readonly string[]
	recommendedOwner?: string
	disposition?: UiLabDisposition
}

export type UiLabReviewUnitInput =
	| (UiLabCatalogEntryBase & {
			coverage: 'rendered'
			Preview: ComponentType
			comparisonFixture?: never
			reason?: never
	  })
	| (UiLabCatalogEntryBase & {
			coverage: 'rendered'
			comparisonFixture: NativeComparisonFixtureId
			Preview?: never
			reason?: never
	  })
	| (UiLabCatalogEntryBase & {
			coverage: 'missing' | 'covered-in-composition' | 'real-app-only'
			comparisonFixture?: never
			reason: string
			Preview?: never
	  })

type UiLabInventoryMetadata = {
	family: string | null
	capabilityKind: UiLabCapabilityKind | null
	sourcePackage: string | null
	packageVersion: string | null
	definitionPath: string | null
	recommendedOwner: string | null
	disposition: UiLabDisposition | null
	consumers: readonly string[] | null
	compositionParent: string | null
	ingredients: readonly string[] | null
	adoption: UiLabAdoptionStatus | null
}

export type UiLabCatalogEntry =
	| (UiLabReviewUnitInput & UiLabInventoryMetadata & { entryKind: 'review-unit' })
	| (UiLabCatalogEntryBase &
			UiLabInventoryMetadata & {
				entryKind: 'ledger-only'
				coverage: Exclude<UiLabCoverage, 'rendered' | 'missing'>
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

const UI_LAB_REVIEW_UNITS: readonly UiLabReviewUnitInput[] = [
	...TICKET_02_SAMPLES,
	...TICKET_03_SAMPLES,
	...TICKET_04_SAMPLES,
	...TICKET_05_SAMPLES,
	...TICKET_06_SAMPLES,
	...TICKET_07_SAMPLES,
	...TICKET_08_SAMPLES,
	...TICKET_09_SAMPLES,
	...TICKET_10_SAMPLES,
	...TICKET_11_SAMPLES,
	...TICKET_12_SAMPLES,
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

type UiLabLedgerEntry = Extract<UiLabCatalogEntry, { entryKind: 'ledger-only' }>

function heroUIRegistrationToEntry(registration: HeroUIRegistration): UiLabLedgerEntry {
	const isUsed = registration.adoption === 'used'
	const isCandidate = registration.adoption === 'candidate'
	const packageLabel = registration.packageName === '@heroui-pro/react' ? 'HeroUI Pro' : 'HeroUI'
	return {
		id: registration.id,
		name: `${packageLabel} ${registration.family}`,
		view: 'heroui',
		category: isUsed ? '已采用' : isCandidate ? '替换候选' : '探索中',
		description: isUsed
			? `生产已使用的 ${packageLabel} ${registration.family}；目录记录真实消费者，不为清单完整度复制预览。`
			: isCandidate
				? `${packageLabel} ${registration.family} 有明确产品替换对象；迁移必须由后续对照证明合同不退化且实现确实简化。`
				: `锁定版本公开的 ${packageLabel} ${registration.family} 能力；StoneFlow 当前没有真实使用场景。`,
		keywords: [
			registration.family,
			registration.packageName,
			registration.exportPath,
			registration.exportKind,
			registration.adoption,
		],
		owner: 'Upstream',
		recommendedOwner: 'Upstream',
		disposition: isCandidate ? 'candidate' : 'keep',
		consumers: registration.consumers,
		compositionParent: registration.consumers.length > 0 ? '生产组合（见消费位置）' : null,
		ingredients: [],
		adoption: registration.adoption,
		family: registration.family,
		capabilityKind: registration.exportKind,
		sourcePackage: registration.packageName,
		packageVersion: registration.packageVersion,
		definitionPath: registration.exportPath,
		source: `${registration.packageName}@${registration.packageVersion} · ${registration.exportPath}`,
		entryKind: 'ledger-only',
		coverage: isUsed
			? 'covered-in-composition'
			: isCandidate
				? 'candidate'
				: 'upstream-no-override',
		states:
			registration.exportKind === 'component'
				? '公开组件能力；具体状态由真实消费场景决定'
				: registration.exportKind === 'function'
					? '函数 API；无独立视觉状态'
					: 'TypeScript 类型；无视觉状态',
		verification: isUsed
			? '生产 import 快照与 catalog 漂移门禁；视觉和交互由消费方验证'
			: '锁定版本公开导出已登记；当前不声明生产覆盖',
		reason: isUsed
			? '当前能力已由真实产品组合消费；独立预览只在能暴露额外判断时补充。'
			: isCandidate
				? '候选只登记，不代表迁移获批；由后续同 fixture 对照决定。'
				: '当前无产品消费者，不创建无假设 Demo，也不计入生产覆盖率。',
	}
}

function stoneFlowCategory(registration: StoneFlowCatalogRegistration) {
	if (registration.kind === 'product-scene') return 'Product Scenes'
	const path = registration.definitionPath.toLocaleLowerCase()
	if (/(dialog|popover|tooltip|drawer|overlay|context-menu)/.test(path)) return 'Overlays'
	if (/(form|field|filter|editor|composer|control)/.test(path)) return 'Fields'
	if (/(sidebar|breadcrumb|navigation|route|page-frame|header)/.test(path)) return 'Navigation'
	if (/(board|row|list|grid|collection|workspace|project|task|lifecycle|view)/.test(path)) {
		return 'Collections'
	}
	if (/(alert|toast|feedback|update|status|empty|error|loading|changelog)/.test(path)) {
		return 'Feedback'
	}
	return 'Actions'
}

function stoneFlowRegistrationToEntry(
	registration: StoneFlowCatalogRegistration,
): UiLabLedgerEntry {
	return {
		id: registration.id,
		name: registration.name,
		view: 'stoneflow',
		category: stoneFlowCategory(registration),
		description:
			registration.kind === 'product-scene'
				? `StoneFlow 产品组合场景；只登记真实组件关系，不复制 Router、Store 或桌面运行时。`
				: `生产可达的 StoneFlow ${registration.name}；由产品组合覆盖，不为总账完整度复制独立 Demo。`,
		keywords: [
			registration.name,
			registration.definitionPath,
			registration.kind,
			...registration.ingredients,
		],
		owner: registration.owner,
		recommendedOwner: registration.recommendedOwner,
		disposition: registration.disposition,
		consumers: registration.consumers,
		compositionParent: registration.compositionParent,
		ingredients: registration.ingredients,
		adoption: registration.adoption,
		family: registration.name,
		capabilityKind: registration.kind,
		sourcePackage: null,
		packageVersion: null,
		definitionPath: registration.definitionPath,
		source: registration.definitionPath,
		entryKind: 'ledger-only',
		coverage: registration.coverage,
		states: '由对应产品组合与真实消费者定义',
		verification: registration.verification,
		reason: registration.reason,
	}
}

const INVENTORY_ENTRIES = [
	...STONEFLOW_CATALOG_REGISTRATIONS.map(stoneFlowRegistrationToEntry),
	...HEROUI_REGISTRATIONS.map(heroUIRegistrationToEntry),
] satisfies readonly UiLabLedgerEntry[]
const INVENTORY_BY_ID = new Map(INVENTORY_ENTRIES.map((entry) => [entry.id, entry]))
const REVIEW_UNIT_IDS = new Set(UI_LAB_REVIEW_UNITS.map((entry) => entry.id))

export const UI_LAB_CATALOG: readonly UiLabCatalogEntry[] = [
	...UI_LAB_REVIEW_UNITS.map((entry) => {
		const inventories = (entry.inventoryRefs ?? [entry.id])
			.map((id) => INVENTORY_BY_ID.get(id))
			.filter((value): value is UiLabLedgerEntry => Boolean(value))
		const inventory = inventories[0]
		const consumers = [...new Set(inventories.flatMap((item) => item.consumers ?? []))]
		const families = inventories.flatMap((item) => (item.family ? [item.family] : []))
		const definitionPaths = [
			...new Set(inventories.flatMap((item) => (item.definitionPath ? [item.definitionPath] : []))),
		]
		const compositionParents = [
			...new Set(
				inventories.flatMap((item) => (item.compositionParent ? [item.compositionParent] : [])),
			),
		]
		const hasProductInventory = inventories.some((item) => item.view === 'stoneflow')
		const derivedIngredients = [...new Set(inventories.flatMap((item) => item.ingredients ?? []))]
		const adoption = inventories.some((item) => item.adoption === 'used')
			? ('used' as const)
			: inventories.some((item) => item.adoption === 'candidate')
				? ('candidate' as const)
				: inventory?.adoption
		return {
			...entry,
			entryKind: 'review-unit' as const,
			owner: entry.owner,
			family: entry.inventoryRefs
				? families.length > 0
					? families.join(' / ')
					: null
				: (inventory?.family ?? null),
			capabilityKind: inventory?.capabilityKind ?? null,
			sourcePackage: inventory?.sourcePackage ?? null,
			packageVersion: inventory?.packageVersion ?? null,
			definitionPath: definitionPaths.length > 0 ? definitionPaths.join('；') : null,
			recommendedOwner: entry.recommendedOwner ?? inventory?.recommendedOwner ?? null,
			disposition:
				entry.disposition ??
				inventory?.disposition ??
				(entry.coverage === 'real-app-only' ? ('real-app-only' as const) : null),
			consumers: consumers.length > 0 ? consumers : (inventory?.consumers ?? null),
			compositionParent: compositionParents.length > 0 ? compositionParents.join('；') : null,
			ingredients:
				entry.ingredients ??
				(hasProductInventory
					? derivedIngredients
					: (entry.inventoryRefs ?? inventory?.ingredients ?? null)),
			adoption: adoption ?? null,
		}
	}),
	...INVENTORY_ENTRIES.filter((entry) => !REVIEW_UNIT_IDS.has(entry.id)),
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
	{
		id: 'batch-09',
		label: '第九批',
		title: 'HeroUI 原子与表单',
		objective:
			'用同一 fixture 核对 OSS 原子、表单与紧凑元数据在 Upstream、Token、Current 三层的归属。',
		entries: TICKET_09_SAMPLES.map(({ id }) => ({
			sampleId: id,
			role: 'target' as const,
			status: 'pending' as const,
		})),
	},
	{
		id: 'batch-10',
		label: '第十批',
		title: 'HeroUI 复杂控件',
		objective: '核对菜单、浮层、集合、命令、Cell Controls 与 Pro 复杂原料的公共状态和产品边界。',
		entries: TICKET_10_SAMPLES.map(({ id }) => ({
			sampleId: id,
			role: 'target' as const,
			status: 'pending' as const,
		})),
	},
	{
		id: 'batch-11',
		label: '第十一批',
		title: 'StoneFlow 共享产品组件',
		objective:
			'核对共享产品组件的公开合同、真实消费者、上游原料与运行时边界，不为 Lab 扩大生产 API。',
		entries: TICKET_11_SAMPLES.map(({ id }) => ({
			sampleId: id,
			role: 'target' as const,
			status: 'pending' as const,
		})),
	},
	{
		id: 'batch-12',
		label: '第十二批',
		title: 'Task 与集合组合',
		objective:
			'复用既有已确认 fixture 和生产公开组件，核对 TaskBoard、选择、批量动作、搜索、Metadata 与 Timeline 的产品边界。',
		entries: TICKET_12_SAMPLES.map(({ id }) => ({
			sampleId: id,
			role: 'target' as const,
			status: 'pending' as const,
		})),
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
