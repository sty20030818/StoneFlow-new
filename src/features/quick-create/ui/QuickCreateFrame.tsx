import type { QuickCreateLayoutController } from '@/features/quick-create/layout/useQuickCreateLayout'
import { QuickCreateBoardRegion } from '@/features/quick-create/ui/QuickCreateBoardRegion'
import { QuickCreateComposerRegion } from '@/features/quick-create/ui/QuickCreateComposerRegion'
import { QuickCreateFeedbackRegion } from '@/features/quick-create/ui/QuickCreateFeedbackRegion'
import { QuickCreateFooterRegion } from '@/features/quick-create/ui/QuickCreateFooterRegion'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'

type QuickCreateFrameProps = {
	isVisible: boolean
	layout: Pick<QuickCreateLayoutController, 'registerRegion' | 'requestMeasure'>
}

export function QuickCreateFrame({ isVisible, layout }: QuickCreateFrameProps) {
	return (
		<div className='relative flex w-full min-h-0 bg-transparent p-7'>
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
