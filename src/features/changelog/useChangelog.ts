import { useEffect, useState } from 'react'

import bundledChangelog from '../../../CHANGELOG.md?raw'
import { getChangelog, getUpdateSettings, type UpdateChannel } from '@/features/update/contract'

import {
	findChangelogEntry,
	parseChangelog,
	visibleChangelogEntries,
	type ChangelogEntry,
} from './model'

let cachedEntries: ChangelogEntry[] | null = null
let pendingEntries: Promise<ChangelogEntry[]> | null = null

async function loadEntries() {
	if (cachedEntries) return cachedEntries
	if (!pendingEntries) {
		pendingEntries = getChangelog()
			.catch(() => null)
			.then((content) => content ?? bundledChangelog)
			.then((content) => {
				cachedEntries = parseChangelog(content)
				return cachedEntries
			})
	}
	return pendingEntries
}

export function useChangelog(version?: string | null, refreshKey?: boolean) {
	const [channel, setChannel] = useState<UpdateChannel>('stable')
	const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)

	useEffect(() => {
		let active = true
		void Promise.all([getUpdateSettings().catch(() => null), loadEntries()]).then(
			([settings, nextEntries]) => {
				if (!active) return
				setChannel(settings?.channel ?? 'stable')
				setEntries(nextEntries)
			},
		)
		return () => {
			active = false
		}
	}, [refreshKey])

	const visibleEntries = entries ? visibleChangelogEntries(entries, channel) : []
	return {
		channel,
		entries: visibleEntries,
		isLoading: entries === null,
		entry: entries ? findChangelogEntry(entries, version) : null,
	}
}
