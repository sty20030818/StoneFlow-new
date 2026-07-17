import { QuickCreateAdvancedCollapse } from '@/features/quick-create/components/QuickCreateAdvancedCollapse'
import { QuickCreateBoardRegion } from '@/features/quick-create/components/QuickCreateBoardRegion'
import { QuickCreateComposer } from '@/features/quick-create/components/QuickCreateComposer'
import { QuickCreateCreateSection } from '@/features/quick-create/components/QuickCreateCreateSection'
import { QuickCreateFeedbackRegion } from '@/features/quick-create/components/QuickCreateFeedbackRegion'
import { QuickCreateFooter } from '@/features/quick-create/components/QuickCreateFooter'
import { QuickCreateSurface } from '@/features/quick-create/components/QuickCreateSurface'

type QuickCreatePanelProps = {
	isVisible: boolean
}

/**
 * 固定壳五行布局：Primary / Advanced / Create / Results(内滚) / Footer。
 * 连续创建 toast 挂在 Results 顶部，不撑外窗。
 */
export function QuickCreatePanel({ isVisible }: QuickCreatePanelProps) {
	return (
		<QuickCreateSurface isVisible={isVisible}>
			<div
				className='grid h-full min-h-0 w-full grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]'
				data-testid='quick-create-panel'
			>
				<div className='shrink-0 border-b border-sf-divider/80 bg-background/70'>
					<QuickCreateComposer />
				</div>

				<div className='shrink-0 bg-background/70'>
					<QuickCreateAdvancedCollapse />
				</div>

				<div className='shrink-0 border-b border-sf-divider/80 px-2 pt-0.5'>
					<QuickCreateCreateSection />
				</div>

				<div
					className='min-h-0 overflow-x-hidden overflow-y-auto'
					data-testid='quick-create-results-scroll'
				>
					<QuickCreateFeedbackRegion />
					<QuickCreateBoardRegion />
				</div>

				<div className='shrink-0'>
					<QuickCreateFooter />
				</div>
			</div>
		</QuickCreateSurface>
	)
}
