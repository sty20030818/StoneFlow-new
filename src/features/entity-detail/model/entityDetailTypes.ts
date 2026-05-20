export type EntityDetailKind = 'task' | 'project'

export type EntityDetailTarget = {
	kind: EntityDetailKind
	id: string
}

export type EntityDetailRouteState = EntityDetailTarget | null

export type EntityDetailOpenMode = 'drawer' | 'page'

export type EntityDetailParseResult = {
	activeDetail: EntityDetailRouteState
	shouldCleanSearch: boolean
}

export type EntityDetailNavigationTarget = {
	pathname: string
	search: string
	replace: boolean
}
