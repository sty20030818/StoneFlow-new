import { Navigate, createHashRouter } from 'react-router-dom'

import { RootRestoreRedirect } from './RootRestoreRedirect'
import { AllTasksPage } from '../features/all-tasks/ui/AllTasksPage'
import { ArchivePage } from '../features/archive/ui/ArchivePage'
import { SpaceLayout } from './layouts/SpaceLayout'
import { InboxPage } from '../features/inbox/ui/InboxPage'
import { NoProjectPage } from '../features/no-project/ui/NoProjectPage'
import { ProjectOverviewPage } from '../features/project-overview/ui/ProjectOverviewPage'
import { ProjectPageRoute } from '../features/project/ui/ProjectPageRoute'
import { QuickCreatePage } from '../features/quick-create/ui/QuickCreatePage'
import { ActivityDebugPage } from '../features/activity/ui/ActivityDebugPage'
import { SettingsPage } from '../features/settings/ui/SettingsPage'
import { TaskPageRoute } from '../features/task/detail/ui/TaskPageRoute'
import { TrashPage } from '../features/trash/ui/TrashPage'
import { ViewsPage } from '../features/views/ui/ViewsPage'

const shellChildren = [
	{
		path: 'inbox',
		element: <InboxPage />,
	},
	{
		path: 'tasks',
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
		path: 'views/:viewId',
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
		path: 'projects/:projectId',
		element: <ProjectPageRoute />,
	},
	{
		path: 'archive',
		element: <ArchivePage />,
	},
	{
		path: 'trash',
		element: <TrashPage />,
	},
]

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
		path: '/settings',
		element: <Navigate replace to='/all/settings' />,
	},
	{
		path: '/debug/activity',
		element: <ActivityDebugPage />,
	},
	{
		path: '/all',
		element: <SpaceLayout />,
		children: [
			{
				index: true,
				element: <Navigate replace to='tasks' />,
			},
			{
				path: 'settings',
				element: <SettingsPage />,
			},
			...shellChildren,
		],
	},
	{
		path: '/spaces/:spaceId',
		element: <SpaceLayout />,
		children: [
			{
				index: true,
				element: <Navigate replace to='inbox' />,
			},
			{
				path: 'settings',
				element: <SettingsPage />,
			},
			...shellChildren,
		],
	},
])
