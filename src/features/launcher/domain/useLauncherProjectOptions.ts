import { startTransition, useCallback } from 'react'

import { listProjectsBySpace } from '../api/launcherApi'
import type { LauncherAction } from './launcherDomainTypes'

type UseLauncherProjectOptionsArgs = {
	dispatch: React.ActionDispatch<[action: LauncherAction]>
}

export function useLauncherProjectOptions({ dispatch }: UseLauncherProjectOptionsArgs) {
	return useCallback(
		async (spaceId: string) => {
			dispatch({ type: 'projectsLoadingStarted' })

			try {
				const payload = await listProjectsBySpace(spaceId)
				startTransition(() => {
					dispatch({
						type: 'projectsLoadingSucceeded',
						options: [payload.noProjectOption, ...payload.projects],
					})
				})
			} catch (error) {
				dispatch({
					type: 'projectsLoadingFailed',
					message: error instanceof Error ? error.message : '项目列表加载失败',
				})
			}
		},
		[dispatch],
	)
}
