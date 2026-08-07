import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	readLocalStorageValue,
	removeLocalStorageValue,
	writeLocalStorageValue,
} from './localStorageValue'

afterEach(() => {
	vi.restoreAllMocks()
	localStorage.clear()
})

describe('localStorageValue', () => {
	it('写入或删除被 Web Storage 拒绝时保留当前会话视图', () => {
		const key = 'stoneflow.test.failed-storage'
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('quota', 'QuotaExceededError')
		})

		writeLocalStorageValue(key, { value: 1 })
		expect(readLocalStorageValue(key)).toEqual({ value: 1 })

		vi.restoreAllMocks()
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
			throw new DOMException('denied', 'SecurityError')
		})
		removeLocalStorageValue(key)
		expect(readLocalStorageValue(key)).toBeNull()
	})
})
