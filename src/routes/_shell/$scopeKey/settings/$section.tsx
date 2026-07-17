import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceSettingsSectionGuard } from '../../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/settings/$section')({
	component: SettingsSection,
})

function SettingsSection() {
	const { scopeKey, section } = Route.useParams()
	return <WorkspaceSettingsSectionGuard scopeKey={scopeKey} section={section} />
}
