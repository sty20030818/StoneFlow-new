import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { cn } from '@/shared/lib/utils'
import { Kbd } from '@/shared/components/base/kbd'
import { quickCreateFooterChromeClass } from '@/shared/components/patterns/quick-create'

export function QuickCreateFooter() {
	const { derived, state } = useQuickCreate()

	return (
		<div
			className={cn(
				quickCreateFooterChromeClass,
				'flex min-h-11 items-center gap-3 px-4 text-[11px] text-sf-text-tertiary',
			)}
			data-testid='quick-create-footer'
		>
			<div
				aria-live='polite'
				className={cn(
					'flex min-w-0 items-center gap-1.5',
					state.submitState === 'error'
						? 'text-sf-danger-surface-text'
						: state.submitState === 'success'
							? 'text-sf-success-surface-text'
							: 'text-sf-text-tertiary',
				)}
			>
				{state.submitState === 'error' ? <AlertTriangleIcon className='size-3.5 shrink-0' /> : null}
				{state.submitState === 'success' ? (
					<CheckCircle2Icon className='size-3.5 shrink-0' />
				) : null}
				{state.submitState === 'submitting' ? (
					<LoaderCircleIcon className='size-3.5 shrink-0 animate-spin' />
				) : null}
				<span className='truncate'>{state.message}</span>
			</div>
			<div className='ml-auto flex items-center gap-3'>
				<Hint keys='↑↓' label='选择' />
				<Hint keys='↵' label={derived.enterLabel} />
				{derived.hasTitle ? <Hint keys='⇧↵' label='连续创建' /> : null}
				{derived.hasTitle ? <Hint keys='⌘/Ctrl+↵' label='创建并打开' /> : null}
				<Hint keys='Esc' label='清空 / 关闭' />
			</div>
		</div>
	)
}

function Hint({ keys, label }: { keys: string; label: string }) {
	return (
		<span className='flex items-center gap-1 whitespace-nowrap'>
			<Kbd>{keys}</Kbd>
			<span>{label}</span>
		</span>
	)
}
