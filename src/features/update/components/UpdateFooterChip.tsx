import { Button, ProgressCircle } from '@heroui/react'
import { DownloadIcon } from 'lucide-react'

import type { UpdateFooterView } from '../model/deriveUpdateFooterView'
import { ActionTooltip } from '@/shared/components/tooltip'

export type UpdateFooterChipProps = {
	view: UpdateFooterView
	onOpen: () => void
}

export function UpdateFooterChip({ view, onOpen }: UpdateFooterChipProps) {
	const color = view.errorMessage ? 'danger' : view.phase === 'ready' ? 'success' : 'accent'
	const variant = view.errorMessage
		? 'danger-soft'
		: view.phase === 'available'
			? 'secondary'
			: 'ghost'

	return (
		<ActionTooltip label={view.title}>
			<Button
				aria-label={view.title}
				className='max-w-40'
				onPress={onOpen}
				size='sm'
				type='button'
				variant={variant}
			>
				{view.phase === 'available' ? (
					<DownloadIcon aria-hidden />
				) : (
					<ProgressCircle
						aria-label={view.title}
						color={color}
						isIndeterminate={view.ringValue === null}
						size='sm'
						value={view.phase === 'ready' ? 100 : (view.ringValue ?? 0)}
					>
						<ProgressCircle.Track>
							<ProgressCircle.TrackCircle />
							<ProgressCircle.FillCircle />
						</ProgressCircle.Track>
					</ProgressCircle>
				)}
				<span className='min-w-0 truncate tabular-nums'>{view.label}</span>
			</Button>
		</ActionTooltip>
	)
}
