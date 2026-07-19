/**
 * Settings section 守卫 + 页面（重）。
 * Index redirect 留在路由文件，避免拖进 SettingsPage。
 */
import { Navigate } from '@tanstack/react-router'

import { DEFAULT_SETTINGS_SECTION, isSettingsSectionKey } from '@/features/settings/contract'
import { SettingsPage } from '@/features/settings/page'

export function WorkspaceSettingsSectionGuard({
	scopeKey,
	section,
}: {
	scopeKey: string
	section: string
}) {
	if (!isSettingsSectionKey(section)) {
		return (
			<Navigate
				params={{ scopeKey, section: DEFAULT_SETTINGS_SECTION }}
				replace
				to='/$scopeKey/settings/$section'
			/>
		)
	}
	return <SettingsPage />
}
