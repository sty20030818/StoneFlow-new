export type ChangelogChannel = 'stable' | 'beta'

export type ChangelogEntry = {
	version: string
	date: string
	content: string
}

const ENTRY_HEADING = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})$/
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/

export function parseChangelog(content: string): ChangelogEntry[] {
	const entries: ChangelogEntry[] = []
	let current: Omit<ChangelogEntry, 'content'> | null = null
	let lines: string[] = []

	function commit() {
		if (!current) return
		entries.push({ ...current, content: lines.join('\n').trim() })
	}

	for (const line of content.split('\n')) {
		const match = ENTRY_HEADING.exec(line)
		if (match) {
			commit()
			current = { version: match[1], date: match[2] }
			lines = []
		} else if (current) {
			lines.push(line)
		}
	}
	commit()
	return entries
}

export function visibleChangelogEntries(entries: ChangelogEntry[], channel: ChangelogChannel) {
	return entries
		.filter((entry) => channel === 'beta' || !entry.version.includes('-'))
		.toSorted(compareVersionsDescending)
}

export function findChangelogEntry(entries: ChangelogEntry[], version: string | null | undefined) {
	return version ? (entries.find((entry) => entry.version === version) ?? null) : null
}

function compareVersionsDescending(a: ChangelogEntry, b: ChangelogEntry) {
	const aParts = VERSION.exec(a.version)
	const bParts = VERSION.exec(b.version)
	if (!aParts || !bParts) return b.version.localeCompare(a.version)
	for (let index = 1; index <= 3; index += 1) {
		const difference = Number(bParts[index]) - Number(aParts[index])
		if (difference !== 0) return difference
	}
	const aBeta = aParts[4] === undefined ? Number.POSITIVE_INFINITY : Number(aParts[4])
	const bBeta = bParts[4] === undefined ? Number.POSITIVE_INFINITY : Number(bParts[4])
	return bBeta - aBeta
}
