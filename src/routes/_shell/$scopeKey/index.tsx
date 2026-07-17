import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceScopeIndexRedirect } from '../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/')({
	component: ScopeIndex,
})

function ScopeIndex() {
	const { scopeKey } = Route.useParams()
	return <WorkspaceScopeIndexRedirect scopeKey={scopeKey} />
}
