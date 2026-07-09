import { describe, expect, it } from 'vitest'

import {
	footerUpdateLabel,
	formatDownloadPercent,
} from '@/features/update/model/updatePresentation'

describe('formatDownloadPercent', () => {
	it('returns null when total missing', () => {
		expect(formatDownloadPercent(100, null)).toBeNull()
	})

	it('clamps to 100', () => {
		expect(formatDownloadPercent(200, 100)).toBe('100%')
	})

	it('formats mid progress', () => {
		expect(formatDownloadPercent(42, 100)).toBe('42%')
	})
})

describe('footerUpdateLabel', () => {
	it('shows percent while downloading', () => {
		expect(
			footerUpdateLabel({
				phase: 'downloading',
				version: '0.2.0',
				downloaded: 50,
				total: 100,
				errorMessage: null,
			}),
		).toBe('50%')
	})

	it('shows ready version', () => {
		expect(
			footerUpdateLabel({
				phase: 'ready',
				version: '0.2.0',
				downloaded: 0,
				total: null,
				errorMessage: null,
			}),
		).toBe('v0.2.0 就绪')
	})
})
