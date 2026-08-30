import { useState, type ComponentType } from 'react'

import { Button, Spinner, Tooltip } from '@heroui/react'

import {
	currentNativeComparisonAccent,
	nativeComparisonUrl,
	type NativeComparisonFixtureId,
	type NativeComparisonMode,
} from './nativeComparisonContract'
import { TICKET_09_NATIVE_FIXTURES } from '../samples/ticket-09/heroUiOssAtomsFormsSamples'
import { TICKET_10_NATIVE_FIXTURES } from '../samples/ticket-10/heroUiComplexControlsSamples'
import { TICKET_14_NATIVE_FIXTURES } from '../samples/ticket-14/candidateNativeFixtures'

function ButtonFixture() {
	const [pressed, setPressed] = useState(false)
	return (
		<div className='flex flex-col items-start gap-4 font-sans'>
			<h3 className='text-base font-semibold'>Button</h3>
			<p className='text-sm leading-6 text-muted'>同一组 props 用于三层；Current 视觉保持冻结。</p>
			<div className='flex flex-wrap items-center gap-2'>
				<Button
					aria-pressed={pressed}
					onPress={() => setPressed((value) => !value)}
					type='button'
					variant='primary'
				>
					{pressed ? '已按下' : '主要操作'}
				</Button>
				<Button type='button' variant='secondary'>
					次要操作
				</Button>
				<Button isDisabled type='button' variant='secondary'>
					不可用
				</Button>
				<Button isPending type='button' variant='primary'>
					<Spinner aria-hidden color='current' size='sm' />
					处理中
				</Button>
			</div>
			<p className='text-xs leading-5 text-muted'>
				用鼠标和 Tab 检查 Hover、Pressed 与 Focus-visible。
			</p>
		</div>
	)
}

function TooltipFixture() {
	return (
		<div className='flex flex-col items-start gap-4 font-sans'>
			<h3 className='text-base font-semibold'>Tooltip</h3>
			<p className='text-sm leading-6 text-muted'>必要信息常驻；浮层只补充非必要说明。</p>
			<Tooltip closeDelay={0} delay={0}>
				<Button type='button' variant='secondary'>
					聚焦或悬停
				</Button>
				<Tooltip.Content placement='bottom'>也可以按 ⌘ K 打开命令面板</Tooltip.Content>
			</Tooltip>
			<p className='text-sm'>整理任务前先确认 Owner 与验证边界。</p>
		</div>
	)
}

const NATIVE_COMPARISON_FIXTURES = {
	button: { label: 'Button', Preview: ButtonFixture },
	tooltip: { label: 'Tooltip', Preview: TooltipFixture },
	...TICKET_09_NATIVE_FIXTURES,
	...TICKET_10_NATIVE_FIXTURES,
	...TICKET_14_NATIVE_FIXTURES,
} satisfies Record<NativeComparisonFixtureId, { label: string; Preview: ComponentType }>
const TALL_FIXTURES = new Set<NativeComparisonFixtureId>([
	'oss-text-fields',
	'oss-select-listbox',
	'oss-combobox-autocomplete',
	'oss-date-color',
	'complex-menu',
	'complex-overlays',
	'complex-collections',
	'complex-command',
	'complex-cell-controls',
	'complex-layout-surfaces',
	'complex-timeline-hover-card',
	'candidate-segment',
])

export function NativeComparisonFixture({ fixture }: { fixture: NativeComparisonFixtureId }) {
	const Preview = NATIVE_COMPARISON_FIXTURES[fixture].Preview
	return <Preview />
}

function BaselineFrame({
	mode,
	fixture,
}: {
	mode: NativeComparisonMode
	fixture: NativeComparisonFixtureId
}) {
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const label = mode === 'upstream' ? 'Upstream' : 'Token'
	const accent = currentNativeComparisonAccent(document.documentElement.dataset.accent)
	const fixtureLabel = NATIVE_COMPARISON_FIXTURES[fixture].label
	const isTall = TALL_FIXTURES.has(fixture)
	const src = nativeComparisonUrl({ mode, fixture, accent })
	return (
		<article aria-label={`${label} 对照`} className='min-w-0 rounded-lg border border-separator'>
			<header className='border-b border-separator px-3 py-2'>
				<h3 className='text-sm font-medium'>{label}</h3>
				<p className='mt-1 text-xs text-muted'>
					{mode === 'upstream'
						? 'HeroUI 官方 CSS · 默认 Light'
						: '官方 CSS + StoneFlow fonts.css / theme.css'}
				</p>
			</header>
			<div className={isTall ? 'relative min-h-[36rem]' : 'relative min-h-72'}>
				<iframe
					className={
						isTall
							? 'h-[36rem] w-full rounded-b-lg bg-background'
							: 'h-72 w-full rounded-b-lg bg-background'
					}
					onError={() => setStatus('error')}
					onLoad={() => setStatus('ready')}
					src={src}
					title={`${label} · ${fixtureLabel} 隔离对照`}
				/>
				{status === 'loading' ? (
					<p
						aria-live='polite'
						className='absolute inset-0 grid place-items-center bg-background text-sm text-muted'
					>
						正在加载 {label} 对照…
					</p>
				) : null}
				{status === 'error' ? (
					<p
						className='absolute inset-0 grid place-items-center bg-background p-4 text-sm text-danger'
						role='alert'
					>
						{label} 对照加载失败，请检查开发期 baseline 入口。
					</p>
				) : null}
			</div>
		</article>
	)
}

export function NativeComparison({
	fixture,
	CurrentPreview,
}: {
	fixture: NativeComparisonFixtureId
	CurrentPreview?: ComponentType
}) {
	const isTall = TALL_FIXTURES.has(fixture)
	return (
		<div className='w-full' data-native-comparison={fixture}>
			<div className='mb-4 rounded-lg border border-separator bg-surface-secondary p-3 text-sm leading-6'>
				<p className='font-medium'>Current 是已确认且冻结的目标视觉</p>
				<p className='mt-1 text-muted'>原生层只用于判断实现所有权，不会自动迁移生产样式。</p>
			</div>
			<div className='grid gap-4 xl:grid-cols-3'>
				<BaselineFrame fixture={fixture} mode='upstream' />
				<BaselineFrame fixture={fixture} mode='token' />
				<article aria-label='Current 对照' className='min-w-0 rounded-lg border border-separator'>
					<header className='border-b border-separator px-3 py-2'>
						<h3 className='text-sm font-medium'>Current</h3>
						<p className='mt-1 text-xs text-muted'>生产 styles/index.css</p>
					</header>
					<div
						className={isTall ? 'h-[36rem] overflow-y-auto p-4' : 'min-h-72 p-4'}
						data-native-comparison-current={fixture}
					>
						{CurrentPreview ? <CurrentPreview /> : <NativeComparisonFixture fixture={fixture} />}
					</div>
				</article>
			</div>
		</div>
	)
}
