import { Navigate, createFileRoute } from '@tanstack/react-router'

import { readLastSettingsSection } from '@/features/settings/contract'

export const Route = createFileRoute('/settings')({
	component: SettingsRedirect,
})

function SettingsRedirect() {
	return (
		<Navigate params={{ section: readLastSettingsSection() }} replace to='/all/settings/$section' />
	)
}
