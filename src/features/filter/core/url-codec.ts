/**
 * FilterQuery ↔ 路由 search 编解码（对齐 Linear「filters 进 URL」）。
 * search 键名：`f`（紧凑 base64url JSON）。
 */

import { normalizeFilterQuery } from './normalize'
import type { FilterQuery } from './types'

/** 列表路由 search 中临时筛选的参数名 */
export const FILTER_SEARCH_PARAM_KEY = 'f' as const

/**
 * 编码为 search 参数值。null 表示无 draft；空查询也是有效的完整 draft。
 */
export function encodeFilterQueryToSearchParam(
	query: FilterQuery | null | undefined,
): string | null {
	if (query == null) {
		return null
	}
	const normalized = normalizeFilterQuery(query)
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
 * 解码 search 参数；缺失 / 非法 → null（无 draft）。
 */
export function decodeFilterQueryFromSearchParam(
	value: string | null | undefined,
): FilterQuery | null {
	if (value == null || value === '') {
		return null
	}
	try {
		const json = fromBase64Url(value)
		const parsed: unknown = JSON.parse(json)
		const query = payloadToQuery(parsed)
		return query ? normalizeFilterQuery(query) : null
	} catch {
		return null
	}
}

function payloadToQuery(parsed: unknown): FilterQuery | null {
	if (!parsed || typeof parsed !== 'object') {
		return null
	}
	const record = parsed as { v?: unknown; c?: unknown }
	if (record.v !== 1 || !Array.isArray(record.c)) {
		return null
	}
	const clauses: FilterQuery['clauses'] = []
	for (const item of record.c) {
		if (!item || typeof item !== 'object') return null
		const row = item as { i?: unknown; f?: unknown; o?: unknown; v?: unknown }
		if (!Array.isArray(row.v) || !row.v.every((value) => typeof value === 'string')) return null
		const normalized = normalizeFilterQuery({
			clauses: [
				{
					id: typeof row.i === 'string' ? row.i : '',
					field: row.f as FilterQuery['clauses'][number]['field'],
					op: row.o as FilterQuery['clauses'][number]['op'],
					values: row.v,
				},
			],
		})
		if (normalized.clauses.length !== 1) return null
		const normalizedValues = new Set(normalized.clauses[0]!.values)
		if (row.v.length === 0 || !row.v.every((value) => normalizedValues.has(value.trim()))) {
			return null
		}
		clauses.push(normalized.clauses[0]!)
	}
	return normalizeFilterQuery({ clauses })
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
