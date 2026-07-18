import { PrimaryMetaBar } from '@/features/launcher/composer/PrimaryMetaBar'

/**
 * Composer 只承接主输入栏；Advanced 由面板独立折叠槽挂载。
 */
export function LauncherComposer() {
	return (
		<div className='shrink-0' data-testid='launcher-composer'>
			<PrimaryMetaBar />
		</div>
	)
}
