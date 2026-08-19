import { describe, expect, it } from 'vitest'

import { deriveUpdateFooterView, isUpdateFooterVisiblePhase } from './deriveUpdateFooterView'

describe('isUpdateFooterVisiblePhase', () => {
	it('only transaction phases', () => {
		expect(isUpdateFooterVisiblePhase('idle')).toBe(false)
		expect(isUpdateFooterVisiblePhase('available')).toBe(true)
		expect(isUpdateFooterVisiblePhase('downloading')).toBe(true)
		expect(isUpdateFooterVisiblePhase('ready')).toBe(true)
		expect(isUpdateFooterVisiblePhase('installing')).toBe(false)
	})
})

describe('deriveUpdateFooterView', () => {
	it('idle → null', () => {
		expect(
			deriveUpdateFooterView({
				phase: 'idle',
				version: null,
				downloaded: 0,
				total: null,
				errorMessage: null,
			}),
		).toBeNull()
	})

	it('downloading with total → ringValue', () => {
		const view = deriveUpdateFooterView({
			phase: 'downloading',
			version: '0.2.0',
			downloaded: 50,
			total: 100,
			errorMessage: null,
		})
		expect(view).not.toBeNull()
		expect(view?.ringValue).toBe(50)
	})

	it('install failure stays Ready and keeps the staged version', () => {
		const view = deriveUpdateFooterView({
			phase: 'ready',
			version: '0.2.0-beta.4',
			downloaded: 0,
			total: null,
			errorMessage: '安装器失败',
		})

		expect(view).toMatchObject({
			phase: 'ready',
			version: '0.2.0-beta.4',
			ringValue: 100,
			errorMessage: '安装器失败',
		})
	})

	it('downloading start without total → 0% and empty ring', () => {
		const view = deriveUpdateFooterView({
			phase: 'downloading',
			version: '0.2.0',
			downloaded: 0,
			total: null,
			errorMessage: null,
		})
		expect(view?.ringValue).toBe(0)
	})
})
