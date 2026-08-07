import { useEffect, useMemo, useState } from 'react'

import bundledChangelog from '../../../CHANGELOG.md?raw'

import { getChangelog } from './api'
import {
	parseChangelogDocument,
	selectChangelogHistory,
	selectChangelogRange,
	type ChangelogChannel,
	type ChangelogDocument,
} from './contract'

export type ChangelogQuery =
	| { readonly kind: 'history'; readonly channel: ChangelogChannel }
	| {
			readonly kind: 'range'
			readonly channel: ChangelogChannel
			readonly currentVersion: string
			readonly targetVersion: string
	  }

let lastValidRemoteDocument: ChangelogDocument | null = null
let inFlightRequest: Promise<ChangelogDocument | null> | null = null

function requestRemoteDocument() {
	if (!inFlightRequest) {
		inFlightRequest = getChangelog()
			.then((content) => (content ? parseChangelogDocument(content) : null))
			.catch(() => null)
			.then((document) => {
				if (document) lastValidRemoteDocument = document
				return document
			})
			.finally(() => {
				inFlightRequest = null
			})
	}
	return inFlightRequest
}

function bundledDocumentOrEmpty(): ChangelogDocument {
	try {
		return parseChangelogDocument(bundledChangelog)
	} catch (error) {
		console.error('[changelog] 打包内置 CHANGELOG.md 无法解析：', error)
		return { unreleased: new Map(), releases: [] }
	}
}

async function loadDocument() {
	return (await requestRemoteDocument()) ?? lastValidRemoteDocument ?? bundledDocumentOrEmpty()
}

export function useChangelog(query: ChangelogQuery | null) {
	const kind = query?.kind ?? null
	const channel = query?.channel ?? null
	const currentVersion = query?.kind === 'range' ? query.currentVersion : null
	const targetVersion = query?.kind === 'range' ? query.targetVersion : null
	const [document, setDocument] = useState<ChangelogDocument | null>(null)
	const [isLoading, setIsLoading] = useState(query !== null)

	useEffect(() => {
		if (!kind || !channel) return
		let active = true
		setIsLoading(true)
		void loadDocument().then((nextDocument) => {
			if (!active) return
			setDocument(nextDocument)
			setIsLoading(false)
		})
		return () => {
			active = false
		}
	}, [channel, currentVersion, kind, targetVersion])

	const releases = useMemo(() => {
		if (!document || !kind || !channel) return []
		if (kind === 'history') return selectChangelogHistory(document, channel)
		if (!currentVersion || !targetVersion) return []
		return selectChangelogRange(document, { channel, currentVersion, targetVersion })
	}, [channel, currentVersion, document, kind, targetVersion])

	return { releases, isLoading: query !== null && isLoading }
}
