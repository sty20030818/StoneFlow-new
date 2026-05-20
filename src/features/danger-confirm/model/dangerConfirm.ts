export type DangerConfirmIntent = 'archive' | 'trash' | 'permanent-delete'

export type DangerConfirmEntityType = 'task' | 'project' | 'space' | 'lifecycle-entry'

export type DangerConfirmRequest = {
	intent: DangerConfirmIntent
	entityType: DangerConfirmEntityType
	count: number
	entityLabel?: string
}

export type DangerConfirmCopy = {
	title: string
	description: string
	confirmLabel: string
	cancelLabel?: string
	destructive: boolean
}

export function buildDangerConfirmCopy(request: DangerConfirmRequest): DangerConfirmCopy {
	const noun = getEntityNoun(request.entityType)
	const destructive =
		request.intent === 'trash' || request.intent === 'permanent-delete'
	const confirmLabel = getConfirmLabel(request.intent)

	if (request.count === 1 && request.entityLabel) {
		return {
			title: `确认${getIntentVerb(request.intent)}「${request.entityLabel}」吗？`,
			description: getSingleDescription(request.intent),
			confirmLabel,
			cancelLabel: '取消',
			destructive,
		}
	}

	return {
		title: getBatchTitle(request.intent, noun),
		description: getBatchDescription(request.intent, request.count, noun),
		confirmLabel,
		cancelLabel: '取消',
		destructive,
	}
}

function getEntityNoun(entityType: DangerConfirmEntityType) {
	switch (entityType) {
		case 'task':
			return '任务'
		case 'project':
			return '项目'
		case 'space':
			return 'Space'
		case 'lifecycle-entry':
			return '条目'
	}
}

function getIntentVerb(intent: DangerConfirmIntent) {
	switch (intent) {
		case 'archive':
			return '归档'
		case 'trash':
			return '移入回收站'
		case 'permanent-delete':
			return '永久删除'
	}
}

function getConfirmLabel(intent: DangerConfirmIntent) {
	switch (intent) {
		case 'archive':
			return '归档'
		case 'trash':
			return '移入回收站'
		case 'permanent-delete':
			return '永久删除'
	}
}

function getSingleDescription(intent: DangerConfirmIntent) {
	switch (intent) {
		case 'archive':
			return '归档后可在归档页恢复。'
		case 'trash':
			return '移入回收站后可恢复。'
		case 'permanent-delete':
			return '此操作不可撤销。'
	}
}

function getBatchTitle(intent: DangerConfirmIntent, noun: string) {
	switch (intent) {
		case 'archive':
			return `归档选中${noun}？`
		case 'trash':
			return `移入回收站选中${noun}？`
		case 'permanent-delete':
			return `永久删除选中${noun}？`
	}
}

function getBatchDescription(intent: DangerConfirmIntent, count: number, noun: string) {
	switch (intent) {
		case 'archive':
			return `将归档 ${count} 个${noun}。归档后可在归档页恢复。`
		case 'trash':
			return `将把 ${count} 个${noun}移入回收站。移入回收站后可恢复。`
		case 'permanent-delete':
			return `将永久删除 ${count} 个${noun}。此操作不可撤销。`
	}
}
