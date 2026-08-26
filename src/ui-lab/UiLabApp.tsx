import { useState } from 'react'

import { Button, SearchField } from '@heroui/react'

import { UI_LAB_SAMPLES, UI_LAB_VIEWS, type UiLabSample, type UiLabViewId } from './uiLabCatalog'

function samplesInView(view: UiLabViewId) {
	return UI_LAB_SAMPLES.filter((sample) => sample.view === view)
}

function firstSample(view: UiLabViewId, category: string) {
	return UI_LAB_SAMPLES.find((sample) => sample.view === view && sample.category === category)
}

export function UiLabApp() {
	const [viewId, setViewId] = useState<UiLabViewId>('stoneflow')
	const [category, setCategory] = useState('Actions')
	const [query, setQuery] = useState('')
	const [selectedId, setSelectedId] = useState('stoneflow-button')

	const view = UI_LAB_VIEWS.find((item) => item.id === viewId)!
	const normalizedQuery = query.trim().toLocaleLowerCase()
	const visibleSamples = samplesInView(viewId).filter((sample) => {
		if (normalizedQuery.length === 0) return sample.category === category
		return [sample.name, sample.description, ...sample.keywords]
			.join(' ')
			.toLocaleLowerCase()
			.includes(normalizedQuery)
	})
	const selectedSample =
		visibleSamples.find((sample) => sample.id === selectedId) ?? visibleSamples[0] ?? null
	const ActivePreview = selectedSample?.Preview

	function selectView(nextViewId: UiLabViewId) {
		const nextView = UI_LAB_VIEWS.find((item) => item.id === nextViewId)!
		const nextSample = firstSample(nextViewId, nextView.defaultCategory)
		setViewId(nextViewId)
		setCategory(nextView.defaultCategory)
		setQuery('')
		setSelectedId(nextSample?.id ?? '')
	}

	function selectCategory(nextCategory: string) {
		setCategory(nextCategory)
		setQuery('')
		setSelectedId(firstSample(viewId, nextCategory)?.id ?? '')
	}

	function selectSample(sample: UiLabSample) {
		setCategory(sample.category)
		setSelectedId(sample.id)
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
						aria-label='搜索样例'
						fullWidth
						onChange={setQuery}
						onClear={() => setQuery('')}
						value={query}
						variant='secondary'
					>
						<SearchField.Group>
							<SearchField.SearchIcon />
							<SearchField.Input placeholder='名称或关键词' />
							<SearchField.ClearButton aria-label='清空搜索' />
						</SearchField.Group>
					</SearchField>

					<section aria-labelledby='ui-lab-category-heading' className='mt-4'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-category-heading'>
							分类
						</h2>
						<div className='flex flex-col gap-1'>
							{view.categories.map((item) => {
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
					</section>

					<section aria-labelledby='ui-lab-sample-heading' className='mt-4'>
						<h2 className='mb-2 text-xs font-medium text-muted' id='ui-lab-sample-heading'>
							样例
						</h2>
						{visibleSamples.length > 0 ? (
							<div className='flex flex-col gap-1'>
								{visibleSamples.map((sample) => (
									<Button
										aria-current={sample.id === selectedSample?.id ? 'true' : undefined}
										fullWidth
										key={sample.id}
										onPress={() => selectSample(sample)}
										type='button'
										variant={sample.id === selectedSample?.id ? 'secondary' : 'ghost'}
									>
										{sample.name}
									</Button>
								))}
							</div>
						) : (
							<p className='rounded-md bg-surface-secondary p-3 text-sm text-muted'>无可用样例</p>
						)}
					</section>
				</aside>

				<main
					className='flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-lg border border-surface bg-background'
					id='ui-lab-preview'
					tabIndex={-1}
				>
					{selectedSample ? (
						<>
							<header className='border-b border-separator p-4'>
								<p className='text-xs font-medium text-muted'>
									{view.label} · {selectedSample.category}
								</p>
								<h2 className='mt-1 text-lg font-semibold'>{selectedSample.name}</h2>
								<p className='mt-1 max-w-3xl text-sm leading-6 text-muted'>
									{selectedSample.description}
								</p>
							</header>

							<dl className='grid grid-cols-2 gap-x-6 gap-y-3 border-b border-separator p-4 text-sm xl:grid-cols-4'>
								<div>
									<dt className='text-xs text-muted'>主要 owner</dt>
									<dd className='mt-1'>{selectedSample.owner}</dd>
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
									<dt className='text-xs text-muted'>所属视图</dt>
									<dd className='mt-1'>{view.label}</dd>
								</div>
							</dl>
						</>
					) : null}

					<section
						aria-label='当前样例预览'
						className='flex min-h-48 flex-1 items-center justify-center p-6 sm:min-h-64'
					>
						{ActivePreview && selectedSample ? (
							<ActivePreview key={selectedSample.id} />
						) : (
							<p className='text-sm text-muted'>
								{normalizedQuery ? '没有匹配的样例' : '这个分类还没有样例'}
							</p>
						)}
					</section>
				</main>
			</div>
		</div>
	)
}
