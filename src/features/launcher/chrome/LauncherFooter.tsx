import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon } from 'lucide-react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import { formatLauncherShortcut, type LauncherShortcutId } from '../model/launcherShortcutKeymap'
import { cn } from '@/shared/lib/utils'
import { Kbd } from '@/shared/components/base/kbd'
import { launcherFooterChromeClass } from '@/shared/components/patterns/launcher'
import { OverflowTooltip } from '@/shared/components/tooltip'

export function LauncherFooter() {
	const { derived, state } = useLauncher()

	return (
		<div
			className={cn(
				launcherFooterChromeClass,
				'flex min-h-11 items-center gap-3 px-4 text-[11px] text-sf-text-tertiary',
			)}
			data-testid='launcher-footer'
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
				<OverflowTooltip className='flex-1' content={state.message}>
					{state.message}
				</OverflowTooltip>
			</div>
			<div className='ml-auto flex items-center gap-3'>
				<Hint label='选择' shortcuts={['selectPrevious', 'selectNext']} />
				<Hint label={derived.enterLabel} shortcuts={['confirm']} />
				{derived.hasTitle ? <Hint label='连续创建' shortcuts={['createAndContinue']} /> : null}
				{derived.hasTitle ? <Hint label='创建并打开' shortcuts={['createAndOpen']} /> : null}
				<Hint label='清空 / 关闭' shortcuts={['clearOrClose']} />
			</div>
		</div>
	)
}

function Hint({ label, shortcuts }: { label: string; shortcuts: readonly LauncherShortcutId[] }) {
	return (
		<span className='flex items-center gap-1 whitespace-nowrap'>
			<Kbd>{shortcuts.map((id) => formatLauncherShortcut(id)).join('')}</Kbd>
			<span>{label}</span>
		</span>
	)
}
