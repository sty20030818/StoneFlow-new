import { buildCanonicalProjectPath, buildTaskDetailPath, type AppRouteKind } from '@/app/routing'
import type { CommandOpenPayload } from '@/shared/events'

type ActiveDetailKind = 'task' | 'project' | null

export function resolveCommandOpenTargetPath(payload: CommandOpenPayload) {
	if (payload.kind === 'task') {
		return buildTaskDetailPath(payload.spaceId, payload.id)
	}

	if (payload.projectId) {
		return buildCanonicalProjectPath(
			{ type: 'space', spaceId: payload.spaceId },
			payload.projectId,
			payload.spaceId,
		)
	}

	return buildCanonicalProjectPath(
		{ type: 'space', spaceId: payload.spaceId },
		payload.id,
		payload.spaceId,
	)
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
