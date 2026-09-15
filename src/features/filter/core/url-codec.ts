/**
 * FilterQuery ↔ 路由 search 编解码（对齐 Linear「filters 进 URL」）。
 * search 键名：`f`（紧凑 base64url JSON）。
 */

import { normalizeFilterQuery } from './normalize'
import type { FilterQuery } from './types'

/** 列表路由 search 中临时筛选的参数名 */
export const FILTER_SEARCH_PARAM_KEY = 'f' as const

/** 编码完整 draft；空查询也有效。移除 draft 由列表会话删除参数。 */
export function encodeFilterQueryToSearchParam(query: FilterQuery): string {
	const normalized = normalizeFilterQuery(query)
	// 同时保留编辑身份与查询语义。
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

/** 缺失参数表示无 draft；损坏参数必须阻止查询，不能静默扩大结果。 */
export function decodeFilterQueryFromSearchParam(
	value: string | null | undefined,
): FilterQuery | null {
	if (value == null) return null
	try {
		return normalizeFilterQuery(payloadToQuery(JSON.parse(fromBase64Url(value))))
	} catch {
		throw new Error('筛选链接无效，请返回列表重新选择筛选。')
	}
}

function payloadToQuery(parsed: unknown): FilterQuery {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
		throw new Error('无效筛选结构')
	const record = parsed as { v?: unknown; c?: unknown }
	if (
		record.v !== 1 ||
		!Array.isArray(record.c) ||
		Object.keys(record).some((key) => !['v', 'c'].includes(key))
	) {
		throw new Error('无效筛选版本或条件列表')
	}
	return {
		clauses: record.c.map((item: unknown) => {
			if (
				!item ||
				typeof item !== 'object' ||
				Array.isArray(item) ||
				Object.keys(item).some((key) => !['i', 'f', 'o', 'v'].includes(key))
			) {
				throw new Error('无效筛选条件')
			}
			const row = item as { i?: unknown; f?: unknown; o?: unknown; v?: unknown }
			// 只还原传输字段；字段、操作符和值由共同规范化入口严格校验。
			return { id: row.i, field: row.f, op: row.o, values: row.v } as FilterQuery['clauses'][number]
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
	return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}
