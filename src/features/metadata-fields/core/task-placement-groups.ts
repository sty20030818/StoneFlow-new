import type { TaskPlacementTarget } from './task-placement-target'

export type TaskPlacementGroupProject = {
	id: string
	name: string
	note?: string | null
	spaceId: string
	spaceName?: string
	completedAt: string | null
}

export type TaskPlacementGroupSpace = {
	id: string
	name: string
}

export type TaskPlacementGroupItem = {
	key: string
	title: string
	meta: string
	value: string
	target: TaskPlacementTarget
	digit?: string
	isEmptyValue?: boolean
	showsDigit?: boolean
}

export type TaskPlacementGroup = {
	spaceId: string
	heading: string
	items: TaskPlacementGroupItem[]
}

export type BuildTaskPlacementGroupsInput = {
	currentSpaceId?: string | null
	spaces: TaskPlacementGroupSpace[]
	projects: TaskPlacementGroupProject[]
}

export type BuildMetadataTaskPlacementGroupsInput = {
	mode: 'global' | 'local'
	currentSpaceId: string
	spaces: TaskPlacementGroupSpace[]
	projects: TaskPlacementGroupProject[]
	includeInbox?: boolean
}

export function buildTaskPlacementGroups({
	currentSpaceId,
	spaces,
	projects,
}: BuildTaskPlacementGroupsInput): TaskPlacementGroup[] {
	if (!currentSpaceId) {
		return []
	}

	const activeProjects = projects.filter((project) => project.completedAt === null)
	const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]))
	const projectsBySpaceId = new Map<string, TaskPlacementGroupProject[]>()

	for (const project of activeProjects) {
		const bucket = projectsBySpaceId.get(project.spaceId)
		if (bucket) {
			bucket.push(project)
			continue
		}

		projectsBySpaceId.set(project.spaceId, [project])
	}

	const orderedSpaceIds = [
		currentSpaceId,
		...Array.from(projectsBySpaceId.keys()).filter((spaceId) => spaceId !== currentSpaceId),
	]

	return orderedSpaceIds.flatMap((spaceId) => {
		const items: TaskPlacementGroupItem[] = []
		const projectsInSpace = projectsBySpaceId.get(spaceId) ?? []

		if (spaceId === currentSpaceId) {
			items.push({
				key: `no-project:${spaceId}`,
				title: '独立事项',
				meta: 'No Project',
				value: getTaskPlacementGroupSearchText({
					title: '独立事项',
					spaceName: spaceNameById.get(spaceId),
					meta: 'no project',
				}),
				target: { kind: 'no_project', spaceId },
				digit: '0',
				isEmptyValue: true,
				showsDigit: true,
			})
		}

		items.push(
			...projectsInSpace.map((project) => ({
				key: `project:${project.id}`,
				title: project.name,
				meta: `Project · ${project.spaceName ?? spaceNameById.get(project.spaceId) ?? project.spaceId}`,
				value: getTaskPlacementGroupSearchText({
					title: project.name,
					note: project.note,
					spaceName: project.spaceName,
				}),
				target: {
					kind: 'project' as const,
					projectId: project.id,
					spaceId: project.spaceId,
				},
			})),
		)

		if (items.length === 0) {
			return []
		}

		return [
			{
				spaceId,
				heading: spaceNameById.get(spaceId) ?? projectsInSpace[0]?.spaceName ?? spaceId,
				items,
			},
		]
	})
}

export function buildMetadataTaskPlacementGroups({
	mode,
	currentSpaceId,
	spaces,
	projects,
	includeInbox = false,
}: BuildMetadataTaskPlacementGroupsInput): TaskPlacementGroup[] {
	const activeProjects = projects.filter((project) => project.completedAt === null)
	const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]))
	const projectsBySpaceId = new Map<string, TaskPlacementGroupProject[]>()

	for (const project of activeProjects) {
		const bucket = projectsBySpaceId.get(project.spaceId)
		if (bucket) {
			bucket.push(project)
			continue
		}

		projectsBySpaceId.set(project.spaceId, [project])
	}

	const orderedSpaces =
		mode === 'local'
			? spaces.filter((space) => space.id === currentSpaceId)
			: [
					...spaces.filter((space) => space.id === currentSpaceId),
					...spaces.filter((space) => space.id !== currentSpaceId),
				]

	return orderedSpaces.flatMap((space) => {
		const items: TaskPlacementGroupItem[] = []
		const projectsInSpace = projectsBySpaceId.get(space.id) ?? []

		if (mode === 'local' && includeInbox) {
			items.push({
				key: `inbox:${space.id}`,
				title: '收件箱',
				meta: 'Inbox',
				value: getTaskPlacementGroupSearchText({
					title: '收件箱',
					spaceName: space.name,
					meta: 'inbox',
				}),
				target: { kind: 'no_project', spaceId: space.id },
				digit: '0',
				isEmptyValue: true,
				showsDigit: true,
			})
		}

		items.push({
			key: `no-project:${space.id}`,
			title: '独立事项',
			meta: 'No Project',
			value: getTaskPlacementGroupSearchText({
				title: '独立事项',
				spaceName: space.name,
				meta: 'no project',
			}),
			target: { kind: 'no_project', spaceId: space.id },
			digit: mode === 'local' && includeInbox ? '1' : '0',
			isEmptyValue: true,
			showsDigit: true,
		})

		items.push(
			...projectsInSpace.map((project) => ({
				key: `project:${project.id}`,
				title: project.name,
				meta: `Project · ${project.spaceName ?? spaceNameById.get(project.spaceId) ?? project.spaceId}`,
				value: getTaskPlacementGroupSearchText({
					title: project.name,
					note: project.note,
					spaceName: project.spaceName ?? space.name,
				}),
				target: {
					kind: 'project' as const,
					projectId: project.id,
					spaceId: project.spaceId,
				},
				showsDigit: false,
			})),
		)

		return [
			{
				spaceId: space.id,
				heading: spaceNameById.get(space.id) ?? space.name,
				items,
			},
		]
	})
}

export function findTaskPlacementGroupItem(
	groups: TaskPlacementGroup[],
	value: TaskPlacementTarget,
) {
	for (const group of groups) {
		for (const item of group.items) {
			if (item.target.kind !== value.kind) {
				continue
			}

			if (item.target.kind === 'project' && value.kind === 'project') {
				if (
					item.target.projectId === value.projectId &&
					item.target.spaceId === value.spaceId
				) {
					return item
				}
				continue
			}

			if (item.target.spaceId === value.spaceId) {
				return item
			}
		}
	}

	return null
}

export function getTaskPlacementGroupSearchText({
	title,
	note,
	spaceName,
	meta,
}: {
	title: string
	note?: string | null
	spaceName?: string | null
	meta?: string | null
}) {
	return [title, note, spaceName, meta].filter((part): part is string => Boolean(part?.trim())).join(' ')
}
