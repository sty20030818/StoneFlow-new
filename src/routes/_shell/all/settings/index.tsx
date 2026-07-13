import { Navigate, createFileRoute } from '@tanstack/react-router'

import { readLastSettingsSection } from '@/features/settings/model/lastSettingsSection'

export const Route = createFileRoute('/_shell/all/settings/')({
	component: AllSettingsIndexRedirect,
})

function AllSettingsIndexRedirect() {
	return (
		<Navigate
			params={{ section: readLastSettingsSection() }}
			replace
			to='/all/settings/$section'
		/>
	)
}
