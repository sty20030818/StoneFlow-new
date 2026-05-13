import { startTransition, useCallback } from 'react'

import { listProjectsBySpace } from '@/features/quick-create/api/quickCreate'
import type { QuickCreateAction } from '@/features/quick-create/model/quickCreateReducer'

type UseQuickCreateProjectOptionsArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
}

export function useQuickCreateProjectOptions({ dispatch }: UseQuickCreateProjectOptionsArgs) {
	return useCallback(
		async (spaceId: string) => {
			dispatch({ type: 'projectsLoadingStarted' })

			try {
				const payload = await listProjectsBySpace(spaceId)
				startTransition(() => {
					dispatch({
						type: 'projectsLoadingSucceeded',
						options: [payload.inboxProject, payload.noProjectOption, ...payload.projects],
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
