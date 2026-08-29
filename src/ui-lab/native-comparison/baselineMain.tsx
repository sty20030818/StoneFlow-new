import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { NativeComparisonFixture } from './NativeComparison'
import { parseNativeComparisonQuery } from './nativeComparisonContract'

const root = createRoot(document.getElementById('root')!)

function renderError(message: string) {
	root.render(
		<main className='p-4' role='alert'>
			<h1>隔离对照无法加载</h1>
			<p>{message}</p>
		</main>,
	)
}

async function bootstrapBaseline() {
	const result = parseNativeComparisonQuery(window.location.search)
	if (!result.ok) {
		renderError(result.message)
		return
	}

	try {
		await (result.value.mode === 'upstream' ? import('./upstream.css') : import('./token.css'))
		document.documentElement.className = 'light'
		if (result.value.mode === 'token') {
			document.documentElement.dataset.theme = 'stoneflow-light'
			document.documentElement.dataset.accent = result.value.accent
		} else {
			delete document.documentElement.dataset.theme
			delete document.documentElement.dataset.accent
		}
		root.render(
			<StrictMode>
				<main className='min-h-screen bg-background p-4 text-foreground'>
					<NativeComparisonFixture fixture={result.value.fixture} />
				</main>
			</StrictMode>,
		)
	} catch (error) {
		renderError(error instanceof Error ? error.message : '未知样式加载错误。')
	}
}

void bootstrapBaseline()
