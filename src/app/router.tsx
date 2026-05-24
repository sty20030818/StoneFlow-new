import { Navigate, createHashRouter, useLocation } from 'react-router-dom'

import { normalizeLegacyRoute } from '@/app/routing'
import { RootRestoreRedirect } from './RootRestoreRedirect'
import { AllTasksPage } from '../features/all-tasks/ui/AllTasksPage'
import { ArchivePage } from '../features/archive/ui/ArchivePage'
import { SpaceLayout } from './layouts/SpaceLayout'
import { InboxPage } from '../features/inbox/ui/InboxPage'
import { NoProjectPage } from '../features/no-project/ui/NoProjectPage'
import { ProjectPage } from '../features/project/ui/ProjectPage'
import { ProjectPageRoute } from '../features/project/ui/ProjectPageRoute'
import { ProjectOverviewPage } from '../features/project-overview/ui/ProjectOverviewPage'
import { QuickCreatePage } from '../features/quick-create/ui/QuickCreatePage'
import { SettingsPage } from '../features/settings/ui/SettingsPage'
import { ActivityDebugPage } from '../features/activity/ui/ActivityDebugPage'
import { TaskPageRoute } from '../features/task/detail/ui/TaskPageRoute'
import { TrashPage } from '../features/trash/ui/TrashPage'
import { ViewsPage } from '../features/views/ui/ViewsPage'

const shellChildren = [
	{
		index: true,
		element: <Navigate replace to='inbox' />,
	},
	{
		path: 'inbox',
		element: <InboxPage />,
	},
	{
		path: 'focus',
		element: <Navigate replace to='../views?view=focus' />,
	},
	{
		path: 'all-tasks',
		element: <AllTasksPage />,
	},
	{
		path: 'no-project',
		element: <NoProjectPage />,
	},
	{
		path: 'views',
		element: <ViewsPage />,
	},
	{
		path: 'projects',
		element: <ProjectOverviewPage />,
	},
	{
		path: 'tasks/:taskId',
		element: <TaskPageRoute />,
	},
	{
		path: 'projects/:projectId/detail',
		element: <ProjectPageRoute />,
	},
	{
		path: 'project/:projectId',
		element: <ProjectPage />,
	},
	{
		path: 'archive',
		element: <ArchivePage />,
	},
	{
		path: 'trash',
		element: <TrashPage />,
	},
	{
		path: 'settings',
		element: <SettingsPage />,
	},
	{
		path: 'debug/activity',
		element: <ActivityDebugPage />,
	},
]

const legacyAllShellRoutes = [
	{
		path: '/spaces',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/inbox',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/focus',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/all-tasks',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/no-project',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/views',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/projects',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/archive',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/trash',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/settings',
		element: <LegacyShellRedirect />,
	},
	{
		path: '/spaces/debug/activity',
		element: <LegacyShellRedirect />,
	},
]

function LegacyShellRedirect() {
	const location = useLocation()
	const currentPath = `${location.pathname}${location.search}${location.hash}`
	const target = normalizeLegacyRoute(currentPath)
	return <Navigate replace to={target} />
}

export const router = createHashRouter([
	{
		path: '/quick-create',
		element: <QuickCreatePage />,
	},
	{
		path: '/',
		element: <RootRestoreRedirect />,
	},
	{
		path: '/tasks/:taskId',
		element: <TaskPageRoute />,
	},
	{
		path: '/projects/:projectId',
		element: <ProjectPageRoute />,
	},
	{
		path: '/all',
		element: <SpaceLayout />,
		children: shellChildren,
	},
	{
		path: '/spaces/:spaceId',
		element: <SpaceLayout />,
		children: shellChildren,
	},
	...legacyAllShellRoutes,
	{
		path: '/space/:spaceId',
		element: <LegacyShellRedirect />,
		children: [
			{
				path: '*',
				element: <LegacyShellRedirect />,
			},
		],
	},
])
