import { createFileRoute } from '@tanstack/react-router'

import { InboxPage } from '@/features/inbox/ui/InboxPage'

export const Route = createFileRoute('/_shell/spaces/$spaceId/inbox')({
	component: InboxPage,
})
