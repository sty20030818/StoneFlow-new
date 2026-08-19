import { normalizeTauriError } from './normalize-tauri-error'

describe('normalizeTauriError', () => {
	it.each([
		[new Error('失败原因'), '失败原因'],
		['直接错误', '直接错误'],
		[{ message: '对象错误' }, '对象错误'],
		[null, '兜底'],
	] as const)('归一化 %o', (error, expected) => {
		expect(normalizeTauriError(error, '兜底')).toBe(expected)
	})
})
