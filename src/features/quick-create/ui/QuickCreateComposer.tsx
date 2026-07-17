import { QuickCreatePrimaryMetaBar } from '@/features/quick-create/ui/QuickCreatePrimaryMetaBar'

/**
 * Composer 只承接主输入栏；Advanced 由面板独立折叠槽挂载。
 */
export function QuickCreateComposer() {
	return (
		<div className='shrink-0' data-testid='quick-create-composer'>
			<QuickCreatePrimaryMetaBar />
		</div>
	)
}
