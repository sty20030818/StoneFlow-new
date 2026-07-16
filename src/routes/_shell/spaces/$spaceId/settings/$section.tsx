import { Navigate, createFileRoute } from '@tanstack/react-router'

import {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
} from '@/features/settings/model/settingsSection'
import { SettingsPage } from '@/features/settings/components/SettingsPage'

export const Route = createFileRoute('/_shell/spaces/$spaceId/settings/$section')({
	component: SpaceSettingsSectionPage,
})

function SpaceSettingsSectionPage() {
	const { spaceId, section } = Route.useParams()

	if (!isSettingsSectionKey(section)) {
		return (
			<Navigate
				params={{ spaceId, section: DEFAULT_SETTINGS_SECTION }}
				replace
				to='/spaces/$spaceId/settings/$section'
			/>
		)
	}

	return <SettingsPage />
}
