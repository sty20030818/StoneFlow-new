import { useEffect, useRef, useState } from 'react'

import { Button, SearchField } from '@heroui/react'

import { registerTaskMetadataIcons } from '@/features/task'

import { NativeComparison } from './native-comparison/NativeComparison'
import {
	reviewBatchForEntry,
	reviewEntryForEntry,
	UI_LAB_CATALOG,
	UI_LAB_REVIEW_BATCHES,
	UI_LAB_VIEWS,
	type UiLabAdoptionStatus,
	type UiLabCapabilityKind,
	type UiLabCatalogEntry,
	type UiLabCoverage,
	type UiLabDisposition,
	type UiLabReviewBatch,
	type UiLabReviewBatchId,
	type UiLabReviewStatus,
	type UiLabViewId,
} from './uiLabCatalog'

registerTaskMetadataIcons()

type CoverageFilter = 'all' | 'no-preview' | 'pending-owner' | 'real-app-only'
type NavigationMode = 'batch' | 'category'

const COVERAGE_FILTERS: readonly { id: CoverageFilter; label: string }[] = [
	{ id: 'all', label: '全部' },
	{ id: 'no-preview', label: '无独立预览' },
	{ id: 'pending-owner', label: '待归属' },
	{ id: 'real-app-only', label: '仅真实应用' },
]

const COVERAGE_LABELS: Record<UiLabCoverage, string> = {
	rendered: 'Lab 已渲染',
	missing: '缺失样例',
	'covered-in-composition': '由产品组合覆盖',
	'upstream-no-override': 'Upstream · 无覆盖',
	candidate: '候选（尚未批准）',
	'real-app-only': '仅真实应用',
}

const CAPABILITY_KIND_LABELS: Record<UiLabCapabilityKind, string> = {
	component: '组件',
	function: '函数 API',
	type: 'TypeScript 类型',
	'product-scene': '产品组合场景',
}

const DISPOSITION_LABELS: Record<UiLabDisposition, string> = {
	keep: 'Keep',
	simplify: 'Simplify',
	candidate: 'Candidate',
	'real-app-only': 'Real-app-only',
}

const ADOPTION_LABELS: Record<UiLabAdoptionStatus, string> = {
	used: '已使用',
	candidate: '替换候选',
	'no-current-scenario': '当前无场景',
}

const REVIEW_STATUS_LABELS: Record<UiLabReviewStatus, string> = {
	done: 'Lab 审查完成',
	pending: '待审查',
	external: '转真实应用验收',
}

function samplesInView(view: UiLabViewId) {
	return UI_LAB_CATALOG.filter((sample) => sample.view === view)
}

function firstSample(view: UiLabViewId, category: string) {
	return UI_LAB_CATALOG.find((sample) => sample.view === view && sample.category === category)
}

function samplesInBatch(view: UiLabViewId, batchId: UiLabReviewBatchId) {
	const batch = UI_LAB_REVIEW_BATCHES.find((item) => item.id === batchId)
	if (!batch) return []
	const sampleIds = new Set(batch.entries.map((entry) => entry.sampleId))
	return UI_LAB_CATALOG.filter((sample) => sample.view === view && sampleIds.has(sample.id))
}

function allSamplesInBatch(batchId: UiLabReviewBatchId) {
	const batch = UI_LAB_REVIEW_BATCHES.find((item) => item.id === batchId)
	if (!batch) return []
	const sampleIds = new Set(batch.entries.map((entry) => entry.sampleId))
	return UI_LAB_CATALOG.filter((sample) => sampleIds.has(sample.id))
}

function reviewBatchProgress(batch: UiLabReviewBatch) {
	const reviewableEntries = batch.entries.filter(
		(entry) =>
			entry.status !== 'external' &&
			UI_LAB_CATALOG.find((sample) => sample.id === entry.sampleId)?.coverage !== 'real-app-only',
	)
	return {
		done: reviewableEntries.filter((entry) => entry.status === 'done').length,
		total: reviewableEntries.length,
		external: batch.entries.filter((entry) => entry.status === 'external').length,
	}
}

export function UiLabApp() {
	const [viewId, setViewId] = useState<UiLabViewId>('stoneflow')
	const [navigationMode, setNavigationMode] = useState<NavigationMode>('batch')
	const [batchId, setBatchId] = useState<UiLabReviewBatchId>('batch-01')
	const [category, setCategory] = useState('Actions')
	const [query, setQuery] = useState('')
	const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all')
	const [selectedId, setSelectedId] = useState('stoneflow-button')
	const previewPaneRef = useRef<HTMLElement>(null)

	const view = UI_LAB_VIEWS.find((item) => item.id === viewId)!
	const selectedBatch = UI_LAB_REVIEW_BATCHES.find((item) => item.id === batchId)!
	const normalizedQuery = query.trim().toLocaleLowerCase()
	const catalogScope =
		navigationMode === 'batch' && normalizedQuery.length === 0
			? UI_LAB_CATALOG
			: samplesInView(viewId)
	const visibleSamples = catalogScope
		.filter((sample) => {
			if (normalizedQuery.length === 0) {
				return navigationMode === 'batch'
					? selectedBatch.entries.some((entry) => entry.sampleId === sample.id)
					: sample.category === category
			}
			return [
				sample.name,
				sample.description,
				sample.source,
				sample.owner,
				sample.recommendedOwner ?? '',
				...(sample.consumers ?? []),
				...sample.keywords,
				sample.family ?? '',
				sample.capabilityKind ?? '',
				sample.sourcePackage ?? '',
				sample.packageVersion ?? '',
				sample.definitionPath ?? '',
				...(sample.ingredients ?? []),
			]
				.join(' ')
				.toLocaleLowerCase()
				.includes(normalizedQuery)
		})
		.filter((sample) => {
			if (coverageFilter === 'no-preview') return sample.coverage !== 'rendered'
			if (coverageFilter === 'pending-owner') return sample.owner === '待归属'
			if (coverageFilter === 'real-app-only') return sample.coverage === 'real-app-only'
			return true
		})
	const selectedSample =
		visibleSamples.find((sample) => sample.id === selectedId) ?? visibleSamples[0] ?? null
	const selectedReviewBatch = selectedSample ? reviewBatchForEntry(selectedSample.id) : undefined
	const selectedReviewEntry = selectedSample ? reviewEntryForEntry(selectedSample.id) : undefined
	let emptyMessage = navigationMode === 'batch' ? '这个批次没有样例' : '这个分类还没有样例'
	if (normalizedQuery) {
		emptyMessage = coverageFilter === 'all' ? '没有匹配的样例' : '没有同时匹配搜索与覆盖筛选的条目'
	} else if (coverageFilter === 'no-preview') {
		emptyMessage = `当前${navigationMode === 'batch' ? '批次' : '分类'}没有无独立预览条目`
	} else if (coverageFilter === 'pending-owner') {
		emptyMessage = `当前${navigationMode === 'batch' ? '批次' : '分类'}没有待归属样例`
	} else if (coverageFilter === 'real-app-only') {
		emptyMessage = `当前${navigationMode === 'batch' ? '批次' : '分类'}没有仅真实应用验证项`
	}

	useEffect(() => {
		if (previewPaneRef.current) previewPaneRef.current.scrollTop = 0
	}, [selectedSample?.id])

	function selectView(nextViewId: UiLabViewId) {
		const nextView = UI_LAB_VIEWS.find((item) => item.id === nextViewId)!
		let nextSample =
			navigationMode === 'batch'
				? samplesInBatch(nextViewId, batchId)[0]
				: firstSample(nextViewId, nextView.defaultCategory)
		if (navigationMode === 'batch' && !nextSample) {
			setNavigationMode('category')
			nextSample = firstSample(nextViewId, nextView.defaultCategory)
		}
		setViewId(nextViewId)
		setCategory(nextView.defaultCategory)
		setQuery('')
		setCoverageFilter('all')
		setSelectedId(nextSample?.id ?? '')
	}

	function selectNavigationMode(nextMode: NavigationMode) {
		setNavigationMode(nextMode)
		setQuery('')
		setCoverageFilter('all')
		if (nextMode === 'batch') {
			const nextBatch = selectedSample ? reviewBatchForEntry(selectedSample.id) : selectedBatch
			setBatchId(nextBatch?.id ?? 'batch-01')
			setSelectedId(
				selectedSample?.view === viewId &&
					nextBatch?.entries.some((entry) => entry.sampleId === selectedSample.id)
					? selectedSample.id
					: (samplesInBatch(viewId, nextBatch?.id ?? 'batch-01')[0]?.id ?? ''),
			)
			return
		}
		const nextCategory = selectedSample?.category ?? view.defaultCategory
		setCategory(nextCategory)
		setSelectedId(selectedSample?.id ?? firstSample(viewId, nextCategory)?.id ?? '')
	}

	function selectBatch(nextBatchId: UiLabReviewBatchId) {
		const nextSample =
			samplesInBatch(viewId, nextBatchId)[0] ?? allSamplesInBatch(nextBatchId)[0] ?? null
		setBatchId(nextBatchId)
		setQuery('')
		setCoverageFilter('all')
		if (nextSample) setViewId(nextSample.view)
		setSelectedId(nextSample?.id ?? '')
	}

	function selectCategory(nextCategory: string) {
		setCategory(nextCategory)
		setQuery('')
		setCoverageFilter('all')
		setSelectedId(firstSample(viewId, nextCategory)?.id ?? '')
	}

	function selectSample(sample: UiLabCatalogEntry) {
		setViewId(sample.view)
		setCategory(sample.category)
		const nextBatch = reviewBatchForEntry(sample.id)
		if (nextBatch) setBatchId(nextBatch.id)
		setSelectedId(sample.id)
	}

	function selectCoverageFilter(nextFilter: CoverageFilter) {
		setCoverageFilter(nextFilter)
		setSelectedId('')
	}

	return (
		<div className='flex h-full min-h-0 flex-col overflow-hidden bg-surface-secondary text-foreground'>
			<a
				className='sr-only z-50 rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:absolute focus:left-2 focus:top-2'
				href='#ui-lab-preview'
			>
				跳到预览
			</a>

			<header className='flex h-11 shrink-0 items-center justify-between gap-3 px-4'>
				<div className='flex min-w-0 items-baseline gap-2'>
					<h1 className='truncate text-sm font-semibold'>StoneFlow UI Lab</h1>
					<p className='truncate text-xs text-muted'>系统级界面观察台</p>
				</div>
				<span className='shrink-0 text-xs text-muted'>开发专用</span>
			</header>

			<div className='grid min-h-0 flex-1 grid-rows-[minmax(0,40vh)_minmax(0,1fr)] gap-2 px-2 pb-2 lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-1'>
				<aside
					aria-label='UI Lab 目录'
					className='min-h-0 overflow-y-auto rounded-lg border border-surface bg-background p-3'
				>
					<section aria-labelledby='ui-lab-view-heading'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-view-heading'>
							视图
						</h2>
						<div className='grid grid-cols-2 gap-2'>
							{UI_LAB_VIEWS.map((item) => (
								<Button
									aria-pressed={item.id === viewId}
									fullWidth
									key={item.id}
									onPress={() => selectView(item.id)}
									type='button'
									variant={item.id === viewId ? 'secondary' : 'ghost'}
								>
									{item.label}
								</Button>
							))}
						</div>
						<p className='mt-2 text-xs leading-5 text-muted'>{view.purpose}</p>
					</section>

					<div className='my-3 h-px bg-separator' />

					<SearchField
						aria-label='搜索目录'
						fullWidth
						onChange={setQuery}
						onClear={() => setQuery('')}
						value={query}
						variant='secondary'
					>
						<SearchField.Group>
							<SearchField.SearchIcon />
							<SearchField.Input placeholder='名称、来源或消费者' />
							<SearchField.ClearButton aria-label='清空搜索' />
						</SearchField.Group>
					</SearchField>

					<section aria-labelledby='ui-lab-coverage-heading' className='mt-4'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-coverage-heading'>
							覆盖
						</h2>
						<div className='grid grid-cols-2 gap-1'>
							{COVERAGE_FILTERS.map((item) => (
								<Button
									aria-pressed={item.id === coverageFilter}
									fullWidth
									key={item.id}
									onPress={() => selectCoverageFilter(item.id)}
									size='sm'
									type='button'
									variant={item.id === coverageFilter ? 'secondary' : 'ghost'}
								>
									{item.label}
								</Button>
							))}
						</div>
					</section>

					<section aria-labelledby='ui-lab-navigation-mode-heading' className='mt-4'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-navigation-mode-heading'>
							组织方式
						</h2>
						<div className='grid grid-cols-2 gap-1'>
							<Button
								aria-pressed={navigationMode === 'batch'}
								fullWidth
								onPress={() => selectNavigationMode('batch')}
								size='sm'
								type='button'
								variant={navigationMode === 'batch' ? 'secondary' : 'ghost'}
							>
								按批次
							</Button>
							<Button
								aria-pressed={navigationMode === 'category'}
								fullWidth
								onPress={() => selectNavigationMode('category')}
								size='sm'
								type='button'
								variant={navigationMode === 'category' ? 'secondary' : 'ghost'}
							>
								按分类
							</Button>
						</div>
					</section>

					<section aria-labelledby='ui-lab-directory-heading' className='mt-4'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-directory-heading'>
							{navigationMode === 'batch' ? '审查批次' : '分类'}
						</h2>
						<div className='flex flex-col gap-1'>
							{navigationMode === 'batch'
								? UI_LAB_REVIEW_BATCHES.map((item) => {
										const progress = reviewBatchProgress(item)
										const isDone = progress.done === progress.total && progress.external === 0
										return (
											<Button
												aria-current={item.id === batchId ? 'true' : undefined}
												fullWidth
												key={item.id}
												onPress={() => selectBatch(item.id)}
												type='button'
												variant={item.id === batchId ? 'secondary' : 'ghost'}
											>
												<span className='flex min-w-0 flex-1 items-center gap-2'>
													<span aria-hidden='true' className='w-3 shrink-0 text-center'>
														{isDone ? '✓' : '○'}
													</span>
													<span className='min-w-0 flex-1 truncate text-left'>
														{item.label} · {item.title}
													</span>
													<span className='shrink-0 text-xs text-muted'>
														{progress.done}/{progress.total}
														{progress.external > 0 ? ` · ${progress.external} 外部` : ''}
													</span>
												</span>
											</Button>
										)
									})
								: view.categories.map((item) => {
										const count = samplesInView(viewId).filter(
											(sample) => sample.category === item,
										).length
										return (
											<Button
												aria-current={item === category ? 'true' : undefined}
												fullWidth
												key={item}
												onPress={() => selectCategory(item)}
												type='button'
												variant={item === category ? 'secondary' : 'ghost'}
											>
												<span className='flex min-w-0 flex-1 items-center justify-between gap-3'>
													<span className='truncate'>{item}</span>
													<span aria-hidden='true' className='text-xs text-muted'>
														{count}
													</span>
												</span>
											</Button>
										)
									})}
						</div>
						{navigationMode === 'batch' ? (
							<p className='mt-2 text-xs leading-5 text-muted'>{selectedBatch.objective}</p>
						) : null}
					</section>

					<section aria-labelledby='ui-lab-sample-heading' className='mt-4'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-sample-heading'>
							{navigationMode === 'batch' ? '审查清单' : '目录条目'}
						</h2>
						{visibleSamples.length > 0 ? (
							<div className='flex flex-col gap-1'>
								{visibleSamples.map((sample) => {
									const reviewEntry = reviewEntryForEntry(sample.id)
									return (
										<Button
											aria-current={sample.id === selectedSample?.id ? 'true' : undefined}
											fullWidth
											key={sample.id}
											onPress={() => selectSample(sample)}
											type='button'
											variant={sample.id === selectedSample?.id ? 'secondary' : 'ghost'}
										>
											{navigationMode === 'batch' && reviewEntry ? (
												<span className='flex min-w-0 flex-1 items-center gap-2'>
													<span aria-hidden='true' className='w-3 shrink-0 text-center'>
														{reviewEntry.status === 'done'
															? '✓'
															: reviewEntry.status === 'external'
																? '↗'
																: '○'}
													</span>
													<span className='min-w-0 flex-1 truncate text-left'>{sample.name}</span>
													<span className='shrink-0 text-xs text-muted'>
														{reviewEntry.role === 'reference'
															? `对照 · ${REVIEW_STATUS_LABELS[reviewEntry.status]}`
															: REVIEW_STATUS_LABELS[reviewEntry.status]}
													</span>
												</span>
											) : (
												sample.name
											)}
										</Button>
									)
								})}
							</div>
						) : (
							<p className='rounded-md bg-surface-secondary p-3 text-sm text-muted'>无可用样例</p>
						)}
					</section>
				</aside>

				<main
					className='flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-lg border border-surface bg-background'
					id='ui-lab-preview'
					ref={previewPaneRef}
					tabIndex={-1}
				>
					{selectedSample ? (
						<>
							<header className='shrink-0 border-b border-separator p-4'>
								<p className='text-xs font-medium text-muted'>
									{view.label} · {selectedReviewBatch?.label ?? '总账'} · {selectedSample.category}
								</p>
								<h2 className='mt-1 text-lg font-semibold'>{selectedSample.name}</h2>
								<p className='mt-1 max-w-3xl text-sm leading-6 text-muted'>
									{selectedSample.description}
								</p>
							</header>

							<dl className='grid shrink-0 grid-cols-2 gap-x-6 gap-y-3 border-b border-separator p-4 text-sm xl:grid-cols-3'>
								<div>
									<dt className='text-xs text-muted'>家族 / 类型</dt>
									<dd className='mt-1'>
										{selectedSample.family ?? '未记录'}
										{selectedSample.capabilityKind
											? ` · ${CAPABILITY_KIND_LABELS[selectedSample.capabilityKind]}`
											: ''}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>来源包 / 锁定版本</dt>
									<dd className='mt-1 break-words'>
										{selectedSample.sourcePackage
											? `${selectedSample.sourcePackage}@${selectedSample.packageVersion}`
											: '项目内组件'}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>当前 Owner</dt>
									<dd className='mt-1'>{selectedSample.owner}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>推荐 Owner</dt>
									<dd className='mt-1'>{selectedSample.recommendedOwner ?? '未记录'}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>处置</dt>
									<dd className='mt-1'>
										{selectedSample.disposition
											? DISPOSITION_LABELS[selectedSample.disposition]
											: '未记录'}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>采用状态</dt>
									<dd className='mt-1'>
										{selectedSample.adoption ? ADOPTION_LABELS[selectedSample.adoption] : '未记录'}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>适用状态</dt>
									<dd className='mt-1'>{selectedSample.states}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>验证边界</dt>
									<dd className='mt-1'>{selectedSample.verification}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>人工审查</dt>
									<dd className='mt-1'>
										{selectedReviewEntry?.role === 'reference' ? 'HeroUI 对照 · ' : ''}
										{selectedReviewEntry
											? REVIEW_STATUS_LABELS[selectedReviewEntry.status]
											: '未纳入批次'}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>来源</dt>
									<dd className='mt-1 break-words'>{selectedSample.source}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>定义路径</dt>
									<dd className='mt-1 break-words'>{selectedSample.definitionPath ?? '未记录'}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>消费 / 覆盖位置</dt>
									<dd className='mt-1 break-words'>
										{selectedSample.consumers && selectedSample.consumers.length > 0
											? selectedSample.consumers.join('；')
											: '当前无生产消费者'}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>组合父项</dt>
									<dd className='mt-1'>{selectedSample.compositionParent ?? '未记录'}</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>上游原料 / 子项</dt>
									<dd className='mt-1 break-words'>
										{selectedSample.ingredients && selectedSample.ingredients.length > 0
											? selectedSample.ingredients.join('；')
											: '无'}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted'>覆盖状态</dt>
									<dd className='mt-1'>{COVERAGE_LABELS[selectedSample.coverage]}</dd>
								</div>
							</dl>
						</>
					) : null}

					<section
						aria-label='当前样例预览'
						className='flex min-h-48 flex-1 items-start justify-center p-6 sm:min-h-64'
					>
						{selectedSample?.coverage === 'rendered' ? (
							selectedSample.comparisonFixture ? (
								<NativeComparison
									fixture={selectedSample.comparisonFixture}
									key={selectedSample.id}
								/>
							) : (
								<selectedSample.Preview key={selectedSample.id} />
							)
						) : selectedSample ? (
							<div className='max-w-2xl rounded-lg border border-dashed border-border p-4 text-sm leading-6'>
								<p className='font-medium'>未在 UI Lab 渲染</p>
								<p className='mt-1 text-muted'>{selectedSample.reason}</p>
							</div>
						) : (
							<p className='text-sm text-muted'>{emptyMessage}</p>
						)}
					</section>
				</main>
			</div>
		</div>
	)
}
