import { QuickCreateAdvancedMetaBar } from '@/features/quick-create/ui/QuickCreateAdvancedMetaBar'
import { QuickCreatePrimaryMetaBar } from '@/features/quick-create/ui/QuickCreatePrimaryMetaBar'

/**
 * Composer 只承接输入与元数据编辑。
 * 顶部保持编辑器语义，不伪装成 row。
 */
export function QuickCreateComposer() {
	return (
		<div data-testid='quick-create-composer'>
			<QuickCreatePrimaryMetaBar />
			<QuickCreateAdvancedMetaBar />
		</div>
	)
}
