import { Navigate, createHashRouter } from 'react-router-dom'

import { SpaceLayout } from './layouts/SpaceLayout'
import { FocusPage } from '../features/focus/ui/FocusPage'
import { InboxPage } from '../features/inbox/ui/InboxPage'
import { ProjectPage } from '../features/project/ui/ProjectPage'
import { QuickCapturePage } from '../features/quick-capture/ui/QuickCapturePage'
import { SettingsPage } from '../features/settings/ui/SettingsPage'
import { TrashPage } from '../features/trash/ui/TrashPage'

export const router = createHashRouter([
	{
		path: '/quick-capture',
		element: <QuickCapturePage />,
	},
	{
		path: '/',
		element: <Navigate to='/space/work/inbox' replace />,
	},
	{
		path: '/space/:spaceId',
		element: <SpaceLayout />,
		children: [
			{
				path: 'inbox',
				element: <InboxPage />,
			},
			{
				path: 'focus',
				element: <FocusPage />,
			},
			{
				path: 'project/:projectId',
				element: <ProjectPage />,
			},
			{
				path: 'trash',
				element: <TrashPage />,
			},
			{
				path: 'settings',
				element: <SettingsPage />,
			},
		],
	},
])
