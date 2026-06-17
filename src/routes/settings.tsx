import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
	component: SettingsRedirect,
})

function SettingsRedirect() {
	return <Navigate replace to='/all/settings' />
}
