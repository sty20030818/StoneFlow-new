import { useEffect, useMemo, useSyncExternalStore } from 'react'

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

function bundledDocumentOrEmpty(): ChangelogDocument {
	try {
		return parseChangelogDocument(bundledChangelog)
	} catch (error) {
		console.error('[changelog] 打包内置 CHANGELOG.md 无法解析：', error)
		return { unreleased: new Map(), releases: [] }
	}
}

const FRESHNESS_MS = 5 * 60 * 1000
let snapshot = { document: bundledDocumentOrEmpty(), isLoading: false }
let lastAttemptAt = -Infinity
let lastRequestedTarget: string | undefined
let inFlightRequest: Promise<void> | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

function getSnapshot() {
	return snapshot
}

function publish(document: ChangelogDocument, isLoading: boolean) {
	snapshot = { document, isLoading }
	for (const listener of listeners) listener()
}

/** 预取与打开弹窗共用文档；新目标缺失时不受历史查询的保鲜期限制。 */
export function prefetchChangelog(targetVersion?: string): Promise<void> {
	if (inFlightRequest) {
		// 在途历史请求可能早于新版本发布；完成后再判断新目标是否仍需补取。
		return targetVersion && targetVersion !== lastRequestedTarget
			? inFlightRequest.then(() => prefetchChangelog(targetVersion))
			: inFlightRequest
	}
	const needsTarget =
		targetVersion !== undefined &&
		targetVersion !== lastRequestedTarget &&
		!snapshot.document.releases.some(
			(release) => release.version === targetVersion && !release.yanked,
		)
	if (!needsTarget && Date.now() - lastAttemptAt < FRESHNESS_MS) return Promise.resolve()

	lastAttemptAt = Date.now()
	if (targetVersion) lastRequestedTarget = targetVersion
	inFlightRequest = getChangelog()
		.then((content) => (content ? parseChangelogDocument(content) : null))
		.catch(() => null)
		.then((document) => {
			// 失败保留当前可读文档；内置内容不会被标记成一次成功远端请求。
			publish(document ?? snapshot.document, false)
		})
		.finally(() => {
			inFlightRequest = null
		})
	publish(snapshot.document, true)
	return inFlightRequest
}

export function useChangelog(query: ChangelogQuery | null) {
	const kind = query?.kind ?? null
	const channel = query?.channel ?? null
	const currentVersion = query?.kind === 'range' ? query.currentVersion : null
	const targetVersion = query?.kind === 'range' ? query.targetVersion : null
	const enabled = query !== null
	const { document, isLoading } = useSyncExternalStore(subscribe, getSnapshot)

	useEffect(() => {
		if (enabled) void prefetchChangelog(targetVersion ?? undefined)
	}, [enabled, targetVersion])

	const releases = useMemo(() => {
		if (!kind || !channel) return []
		if (kind === 'history') return selectChangelogHistory(document, channel)
		if (!currentVersion || !targetVersion) return []
		return selectChangelogRange(document, { channel, currentVersion, targetVersion })
	}, [channel, currentVersion, document, kind, targetVersion])

	return { releases, isLoading: query !== null && isLoading }
}
