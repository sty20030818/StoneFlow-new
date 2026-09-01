import { Spinner } from '@heroui/react'
import { AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import { getLauncherShortcutTokens, type LauncherShortcutId } from '../model/launcherShortcutKeymap'
import { cn } from '@/shared/lib/utils'
import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { OverflowTooltip } from '@/shared/components/tooltip'

export function LauncherFooter() {
	const { derived, state } = useLauncher()

	return (
		<div
			className={cn(
				'shrink-0 flex min-h-11 items-center gap-3 rounded-b-(--launcher-panel-radius,8px) border-t border-separator bg-surface px-2 text-[11px] text-muted',
			)}
			data-testid='launcher-footer'
		>
			<div
				aria-live='polite'
				className={cn(
					'flex min-w-0 items-center gap-1.5',
					state.submitState === 'error'
						? 'text-danger-on-surface'
						: state.submitState === 'success'
							? 'text-success-on-surface'
							: 'text-muted',
				)}
			>
				{state.submitState === 'error' ? <AlertTriangleIcon className='size-3.5 shrink-0' /> : null}
				{state.submitState === 'success' ? (
					<CheckCircle2Icon className='size-3.5 shrink-0' />
				) : null}
				{state.submitState === 'submitting' ? (
					<Spinner aria-hidden color='current' size='sm' />
				) : null}
				<OverflowTooltip className='flex-1' content={state.message}>
					{state.message}
				</OverflowTooltip>
			</div>
			<div className='ml-auto flex items-center gap-3'>
				<Hint label='选择' shortcuts={['selectPrevious', 'selectNext']} />
				<Hint label={derived.enterLabel} shortcuts={['confirm']} />
				{derived.hasTitle ? (
					<span className='hidden items-center gap-3 md:flex'>
						<Hint label='连续创建' shortcuts={['createAndContinue']} />
						<Hint label='创建并打开' shortcuts={['createAndOpen']} />
					</span>
				) : null}
				<Hint label='清空 / 关闭' shortcuts={['clearOrClose']} />
			</div>
		</div>
	)
}

function Hint({ label, shortcuts }: { label: string; shortcuts: readonly LauncherShortcutId[] }) {
	return (
		<span className='flex items-center gap-1 whitespace-nowrap'>
			{shortcuts.map((id) => (
				<ShortcutTokens className='gap-1' key={id} tokens={getLauncherShortcutTokens(id)} />
			))}
			<span>{label}</span>
		</span>
	)
}
