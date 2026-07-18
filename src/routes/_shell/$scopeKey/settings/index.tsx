import { Navigate, createFileRoute } from '@tanstack/react-router'

import { readLastSettingsSection } from '@/features/settings/contract'

export const Route = createFileRoute('/_shell/$scopeKey/settings/')({
	component: SettingsIndex,
})

function SettingsIndex() {
	const { scopeKey } = Route.useParams()
	return (
		<Navigate
			params={{ scopeKey, section: readLastSettingsSection() }}
			replace
			to='/$scopeKey/settings/$section'
		/>
	)
}
