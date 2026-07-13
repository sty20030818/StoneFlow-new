import { UpdateSettingsSection } from '@/features/update'

/**
 * 应用更新偏好（复用既有 UpdateSettingsSection UI）。
 */
export function SettingsUpdatePanel() {
	return (
		<div className='flex w-full min-w-0 flex-col gap-4'>
			<UpdateSettingsSection />
		</div>
	)
}
