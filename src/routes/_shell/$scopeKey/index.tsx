import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/$scopeKey/')({
	component: ScopeIndex,
})

function ScopeIndex() {
	const { scopeKey } = Route.useParams()
	if (scopeKey === 'all') {
		return <Navigate params={{ scopeKey: 'all' }} replace to='/$scopeKey/tasks' />
	}
	return <Navigate params={{ scopeKey }} replace to='/$scopeKey/inbox' />
}
