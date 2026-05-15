import type { CommandChordSession } from '@/features/command/shortcuts'
import { Kbd } from '@/shared/ui/base/kbd'

type ChordHintProps = {
	session: CommandChordSession | null
}

export function ChordHint({ session }: ChordHintProps) {
	if (!session || session.options.length === 0) {
		return null
	}

	return (
		<div className='pointer-events-none absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2'>
			<div className='flex min-w-64 items-center gap-3 rounded-xl border border-border/80 bg-popover/96 px-3 py-2 shadow-(--sf-shadow-float)'>
				<div className='flex items-center gap-2 text-xs text-muted-foreground'>
					<span>前缀</span>
					<Kbd>{session.prefixDisplay}</Kbd>
				</div>
				<div className='h-4 w-px bg-border/80' />
				<div className='min-w-0 flex items-center gap-1 text-xs text-muted-foreground'>
					<span className='shrink-0'>可用第二键</span>
					<div className='min-w-0 truncate'>
						{session.options.map((option) => option.display).join(' / ')}
					</div>
				</div>
			</div>
		</div>
	)
}
