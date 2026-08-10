export type EntityDetailKind = 'task' | 'project'

export type EntityDetailTarget = {
	kind: EntityDetailKind
	id: string
}

export type EntityDetailDrawerTarget = {
	kind: 'task'
	id: string
}

export type EntityDetailRouteState = EntityDetailDrawerTarget | null

export type EntityDetailParseResult = {
	activeDetail: EntityDetailRouteState
	shouldCleanSearch: boolean
}

export type EntityDetailNavigationTarget = {
	pathname: string
	search: string
	replace: boolean
}
