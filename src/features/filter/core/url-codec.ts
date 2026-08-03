/**
 * FilterQuery ↔ 路由 search 编解码（对齐 Linear「filters 进 URL」）。
 * search 键名：`f`（紧凑 base64url JSON）。
 */

import { isFilterQueryEmpty, normalizeFilterQuery } from './normalize'
import { EMPTY_FILTER_QUERY, type FilterQuery } from './types'

/** 列表路由 search 中临时筛选的参数名 */
export const FILTER_SEARCH_PARAM_KEY = 'f' as const

/**
 * 编码为 search 参数值；空查询返回 null（调用方应删除该 key）。
 */
export function encodeFilterQueryToSearchParam(
	query: FilterQuery | null | undefined,
): string | null {
	const normalized = normalizeFilterQuery(query)
	if (isFilterQueryEmpty(normalized)) {
		return null
	}
	// 序列化时不依赖 id 稳定性：用 field/op/values 即可 round-trip 语义
	const payload = {
		v: 1 as const,
		c: normalized.clauses.map((clause) => ({
			i: clause.id,
			f: clause.field,
			o: clause.op,
			v: clause.values,
		})),
	}
	return toBase64Url(JSON.stringify(payload))
}

/**
 * 解码 search 参数；非法 / 空 → empty（安全降级）。
 */
export function decodeFilterQueryFromSearchParam(value: string | null | undefined): FilterQuery {
	if (value == null || value === '') {
		return EMPTY_FILTER_QUERY
	}
	try {
		const json = fromBase64Url(value)
		const parsed: unknown = JSON.parse(json)
		return normalizeFilterQuery(payloadToQuery(parsed))
	} catch {
		return EMPTY_FILTER_QUERY
	}
}

/**
 * 将 FilterQuery 写入 search 对象副本：有条件设 `f`，无条件删除 `f`。
 */
export function mergeFilterQueryIntoSearch(
	search: Record<string, unknown>,
	query: FilterQuery | null | undefined,
): Record<string, unknown> {
	const next = { ...search }
	const encoded = encodeFilterQueryToSearchParam(query)
	if (encoded == null) {
		delete next[FILTER_SEARCH_PARAM_KEY]
	} else {
		next[FILTER_SEARCH_PARAM_KEY] = encoded
	}
	return next
}

/**
 * 从 search 对象读取临时 FilterQuery。
 */
export function readFilterQueryFromSearch(
	search: Record<string, unknown> | null | undefined,
): FilterQuery {
	if (!search) {
		return EMPTY_FILTER_QUERY
	}
	const raw = search[FILTER_SEARCH_PARAM_KEY]
	if (typeof raw !== 'string') {
		return EMPTY_FILTER_QUERY
	}
	return decodeFilterQueryFromSearchParam(raw)
}

function payloadToQuery(parsed: unknown): FilterQuery {
	if (!parsed || typeof parsed !== 'object') {
		return EMPTY_FILTER_QUERY
	}
	const record = parsed as { v?: unknown; c?: unknown }
	if (record.v !== 1 || !Array.isArray(record.c)) {
		return EMPTY_FILTER_QUERY
	}
	return {
		clauses: record.c.map((item) => {
			if (!item || typeof item !== 'object') {
				return { id: '', field: 'status', op: 'is', values: [] }
			}
			const row = item as { i?: unknown; f?: unknown; o?: unknown; v?: unknown }
			return {
				id: typeof row.i === 'string' ? row.i : '',
				field: row.f as FilterQuery['clauses'][number]['field'],
				op: row.o as FilterQuery['clauses'][number]['op'],
				values: Array.isArray(row.v) ? (row.v as string[]) : [],
			}
		}),
	}
}

function toBase64Url(text: string): string {
	const bytes = new TextEncoder().encode(text)
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	// vitest / 浏览器均有 btoa；避免依赖 Node Buffer（前端 tsconfig 无 @types/node）
	const base64 = btoa(binary)
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/')
	const padLength = (4 - (padded.length % 4)) % 4
	const base64 = padded + '='.repeat(padLength)
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return new TextDecoder().decode(bytes)
}
