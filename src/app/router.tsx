import { Navigate, createHashRouter } from 'react-router-dom'

import { RootRestoreRedirect } from './RootRestoreRedirect'
import { AllTasksPage } from '../features/all-tasks/ui/AllTasksPage'
import { ArchivePage } from '../features/archive/ui/ArchivePage'
import { SpaceLayout } from './layouts/SpaceLayout'
import { InboxPage } from '../features/inbox/ui/InboxPage'
import { NoProjectPage } from '../features/no-project/ui/NoProjectPage'
import { ProjectPage } from '../features/project/ui/ProjectPage'
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
		path: '/spaces',
		element: <SpaceLayout />,
		children: shellChildren,
	},
	{
		path: '/space/:spaceId',
		element: <SpaceLayout />,
		children: shellChildren,
	},
])
