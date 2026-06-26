import { describe, expect, it } from 'vitest'

import { normalizeSubmitError } from './normalize-submit-error'

describe('normalizeSubmitError', () => {
	it('优先返回 Error.message', () => {
		expect(normalizeSubmitError(new Error('失败原因'), '兜底')).toBe('失败原因')
	})

	it('支持字符串错误', () => {
		expect(normalizeSubmitError('直接错误', '兜底')).toBe('直接错误')
	})

	it('支持 message 字段对象', () => {
		expect(normalizeSubmitError({ message: '对象错误' }, '兜底')).toBe('对象错误')
	})

	it('未知错误退回兜底文案', () => {
		expect(normalizeSubmitError(null, '兜底')).toBe('兜底')
	})
})
