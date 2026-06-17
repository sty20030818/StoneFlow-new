import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/features/settings/ui/SettingsPage'

export const Route = createFileRoute('/spaces/$spaceId/settings')({
	component: SettingsPage,
})
