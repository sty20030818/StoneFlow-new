import type { PointerEvent } from 'react'

import type { QuickCreateLayoutController } from '@/features/quick-create/layout/useQuickCreateLayout'
import { QuickCreateBoardRegion } from '@/features/quick-create/components/QuickCreateBoardRegion'
import { QuickCreateComposerRegion } from '@/features/quick-create/components/QuickCreateComposerRegion'
import { QuickCreateFeedbackRegion } from '@/features/quick-create/components/QuickCreateFeedbackRegion'
import { QuickCreateFooterRegion } from '@/features/quick-create/components/QuickCreateFooterRegion'
import { QuickCreateSurface } from '@/features/quick-create/components/QuickCreateSurface'

type QuickCreateFrameProps = {
	isVisible: boolean
	layout: Pick<QuickCreateLayoutController, 'registerRegion' | 'requestMeasure'>
	onRequestClose: () => void
}

export function QuickCreateFrame({ isVisible, layout, onRequestClose }: QuickCreateFrameProps) {
	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!isVisible || event.target !== event.currentTarget) {
			return
		}
		onRequestClose()
	}

	return (
		<div
			className='relative flex w-full min-h-0 bg-transparent p-7'
			onPointerDown={handlePointerDown}
		>
			<QuickCreateSurface
				className={`w-full transition-opacity duration-150 ${
					isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
				}`}
				ref={layout.registerRegion('surface')}
			>
				<div
					className='flex w-full shrink-0 flex-col'
					data-testid='quick-create-content-flow'
					ref={layout.registerRegion('content')}
				>
					<QuickCreateComposerRegion ref={layout.registerRegion('composer')} />
					<QuickCreateFeedbackRegion ref={layout.registerRegion('toast')} />
					<QuickCreateBoardRegion
						createRowRef={layout.registerRegion('createRow')}
						onLayoutChange={layout.requestMeasure}
						projectBoardRef={layout.registerRegion('projectBoard')}
						taskBoardRef={layout.registerRegion('taskBoard')}
					/>
					<QuickCreateFooterRegion ref={layout.registerRegion('footer')} />
				</div>
			</QuickCreateSurface>
		</div>
	)
}
