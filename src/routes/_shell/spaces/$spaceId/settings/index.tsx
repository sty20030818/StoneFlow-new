import { Navigate, createFileRoute } from '@tanstack/react-router'

import { readLastSettingsSection } from '@/features/settings/contract'

export const Route = createFileRoute('/_shell/spaces/$spaceId/settings/')({
	component: SpaceSettingsIndexRedirect,
})

function SpaceSettingsIndexRedirect() {
	const { spaceId } = Route.useParams()
	return (
		<Navigate
			params={{ spaceId, section: readLastSettingsSection() }}
			replace
			to='/spaces/$spaceId/settings/$section'
		/>
	)
}
