import { Navigate, createHashRouter } from 'react-router-dom'

import { AllTasksPage } from '../features/all-tasks/ui/AllTasksPage'
import { ArchivePage } from '../features/archive/ui/ArchivePage'
import { SpaceLayout } from './layouts/SpaceLayout'
import { InboxPage } from '../features/inbox/ui/InboxPage'
import { ProjectPage } from '../features/project/ui/ProjectPage'
import { ProjectOverviewPage } from '../features/project-overview/ui/ProjectOverviewPage'
import { QuickCapturePage } from '../features/quick-capture/ui/QuickCapturePage'
import { SettingsPage } from '../features/settings/ui/SettingsPage'
import { ActivityDebugPage } from '../features/activity/ui/ActivityDebugPage'
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
		element: <Navigate replace to='../views' />,
	},
	{
		path: 'all-tasks',
		element: <AllTasksPage />,
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
		path: '/quick-capture',
		element: <QuickCapturePage />,
	},
	{
		path: '/',
		element: <Navigate to='/spaces/inbox' replace />,
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
