import { Navigate, createFileRoute } from '@tanstack/react-router'

import { DEFAULT_SETTINGS_SECTION } from '@/features/settings/model/settingsSection'

export const Route = createFileRoute('/_shell/all/settings/')({
	component: AllSettingsIndexRedirect,
})

function AllSettingsIndexRedirect() {
	return (
		<Navigate
			params={{ section: DEFAULT_SETTINGS_SECTION }}
			replace
			to='/all/settings/$section'
		/>
	)
}
