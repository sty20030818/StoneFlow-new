import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/all/')({
	component: AllIndexRedirect,
})

function AllIndexRedirect() {
	return <Navigate replace to='/all/tasks' />
}
