import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceSettingsIndexRedirect } from '../../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/settings/')({
	component: SettingsIndex,
})

function SettingsIndex() {
	const { scopeKey } = Route.useParams()
	return <WorkspaceSettingsIndexRedirect scopeKey={scopeKey} />
}
