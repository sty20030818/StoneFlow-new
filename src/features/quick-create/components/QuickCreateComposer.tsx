import { QuickCreateAdvancedMetaBar } from '@/features/quick-create/components/QuickCreateAdvancedMetaBar'
import { QuickCreatePrimaryMetaBar } from '@/features/quick-create/components/QuickCreatePrimaryMetaBar'

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
