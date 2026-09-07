/// <reference types="vitest/globals" />

import { gzipSync } from 'node:zlib'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
	checkBundleBudget,
	collectInitialJavaScriptReferences,
	entryBudgetViolations,
	measureEntryInitialJavaScript,
} from './check-bundle-budget'

describe('bundle budget', () => {
	test('按入口 script 与 modulepreload 去重计算各文件 raw/gzip', async () => {
		const distDir = await mkdtemp(join(tmpdir(), 'stoneflow-bundle-budget-'))
		const entryBytes = Buffer.from("console.log('entry')")
		const sharedBytes = Buffer.from('export const shared = true')
		try {
			await mkdir(join(distDir, 'assets'))
			await Promise.all([
				writeFile(join(distDir, 'assets/entry.js'), entryBytes),
				writeFile(join(distDir, 'assets/shared.js'), sharedBytes),
				writeFile(join(distDir, 'avatar.jpg'), 'avatar'),
				writeFile(join(distDir, 'StoneFlow.png'), 'logo'),
			])
			const html = `
<script crossorigin src="/assets/entry.js" type="module"></script>
<link href="/assets/shared.js" rel="modulepreload" crossorigin>
<link rel="modulepreload" href="/assets/shared.js">
<script src="/assets/not-initial.js"></script>
<link rel="prefetch" href="/assets/not-initial.js">
`
			await Promise.all([
				writeFile(join(distDir, 'index.html'), html),
				writeFile(join(distDir, 'launcher.html'), html),
			])

			expect(collectInitialJavaScriptReferences(html)).toEqual([
				'/assets/entry.js',
				'/assets/shared.js',
			])
			const measurement = await measureEntryInitialJavaScript(distDir, 'index.html')
			expect(measurement.files.map((file) => file.path)).toEqual([
				'assets/entry.js',
				'assets/shared.js',
			])
			expect(measurement.totalRawBytes).toBe(entryBytes.byteLength + sharedBytes.byteLength)
			expect(measurement.totalGzipBytes).toBe(
				gzipSync(entryBytes).byteLength + gzipSync(sharedBytes).byteLength,
			)
			expect((await checkBundleBudget(distDir)).entries).toHaveLength(2)
		} finally {
			await rm(distDir, { recursive: true, force: true })
		}
	})

	test('总量与最大单文件的 raw/gzip 四项预算都参与判定', () => {
		const measurement = {
			htmlFile: 'index.html',
			files: [],
			totalRawBytes: 101,
			totalGzipBytes: 102,
			maxInitialRawBytes: 103,
			maxInitialGzipBytes: 104,
		}
		expect(
			entryBudgetViolations(measurement, {
				htmlFile: 'index.html',
				totalRawBytes: 100,
				totalGzipBytes: 100,
				maxInitialRawBytes: 100,
				maxInitialGzipBytes: 100,
			}),
		).toHaveLength(4)
	})
})
