import { Navigate, createFileRoute } from '@tanstack/react-router'

import { DEFAULT_SETTINGS_SECTION } from '@/features/settings/model/settingsSection'

export const Route = createFileRoute('/_shell/spaces/$spaceId/settings/')({
	component: SpaceSettingsIndexRedirect,
})

function SpaceSettingsIndexRedirect() {
	const { spaceId } = Route.useParams()
	return (
		<Navigate
			params={{ spaceId, section: DEFAULT_SETTINGS_SECTION }}
			replace
			to='/spaces/$spaceId/settings/$section'
		/>
	)
}
