import { Navigate, createFileRoute } from '@tanstack/react-router'

import {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
} from '@/features/settings/model/settingsSection'
import { SettingsPage } from '@/features/settings/components/SettingsPage'

export const Route = createFileRoute('/_shell/all/settings/$section')({
	component: AllSettingsSectionPage,
})

function AllSettingsSectionPage() {
	const { section } = Route.useParams()

	if (!isSettingsSectionKey(section)) {
		return (
			<Navigate
				params={{ section: DEFAULT_SETTINGS_SECTION }}
				replace
				to='/all/settings/$section'
			/>
		)
	}

	return <SettingsPage />
}
