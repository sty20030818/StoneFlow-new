import { describe, expect, it } from 'vitest'

import {
	downloadProgressBarValue,
	footerUpdateLabel,
	formatBytes,
	formatDownloadBytesLine,
	formatDownloadPercent,
} from './updatePresentation'

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

describe('downloadProgressBarValue', () => {
	it('is 0 when total unknown (avoids full-width bar)', () => {
		expect(downloadProgressBarValue(0, null)).toBe(0)
		expect(downloadProgressBarValue(999, null)).toBe(0)
	})

	it('maps known total to percent', () => {
		expect(downloadProgressBarValue(0, 100)).toBe(0)
		expect(downloadProgressBarValue(50, 100)).toBe(50)
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

	it('shows 0% at download start without total', () => {
		expect(
			footerUpdateLabel({
				phase: 'downloading',
				version: '0.2.0',
				downloaded: 0,
				total: null,
				errorMessage: null,
			}),
		).toBe('0%')
	})

	it('shows 下载中 when bytes flow without total', () => {
		expect(
			footerUpdateLabel({
				phase: 'downloading',
				version: '0.2.0',
				downloaded: 1024,
				total: null,
				errorMessage: null,
			}),
		).toBe('下载中')
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

describe('formatBytes', () => {
	it('formats zero', () => {
		expect(formatBytes(0)).toBe('0 B')
	})

	it('formats megabytes', () => {
		expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
	})
})

describe('formatDownloadBytesLine', () => {
	it('includes total and percent when known', () => {
		expect(formatDownloadBytesLine(512 * 1024, 1024 * 1024)).toContain('MB')
		expect(formatDownloadBytesLine(512 * 1024, 1024 * 1024)).toContain('50%')
	})

	it('shows 0% at start without total', () => {
		expect(formatDownloadBytesLine(0, null)).toBe('0%')
	})

	it('shows bytes when downloading without total', () => {
		expect(formatDownloadBytesLine(2048, null)).toContain('已下载')
	})
})
