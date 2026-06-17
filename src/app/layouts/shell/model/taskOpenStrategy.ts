import { openProjectDetail, openTaskDetail } from '@/app/navigation/intents'
import type { AppRouteKind } from '@/app/routing'
import type { CommandOpenPayload } from '@/shared/events'

type ActiveDetailKind = 'task' | 'project' | null

export function resolveCommandOpenTargetPath(payload: CommandOpenPayload) {
	if (payload.kind === 'task') {
		return openTaskDetail(payload.id, payload.spaceId)
	}

	if (payload.projectId) {
		return openProjectDetail(payload.projectId, {
			scope: { type: 'space', spaceId: payload.spaceId },
			fallbackSpaceId: payload.spaceId,
		})
	}

	return openProjectDetail(payload.id, {
		scope: { type: 'space', spaceId: payload.spaceId },
		fallbackSpaceId: payload.spaceId,
	})
}

export function resolveShellDetailState({
	activeDetailKind,
	routeKind,
}: {
	activeDetailKind: ActiveDetailKind
	routeKind: AppRouteKind
}) {
	if (activeDetailKind) {
		return {
			isDetailOpen: true,
			detailEntityType: activeDetailKind,
		} as const
	}

	if (routeKind === 'task') {
		return {
			isDetailOpen: true,
			detailEntityType: 'task',
		} as const
	}

	return {
		isDetailOpen: false,
		detailEntityType: undefined,
	} as const
}
