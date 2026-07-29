import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import { cleanGeneratedDirectories } from './clean'

describe('cleanGeneratedDirectories', () => {
	test('只删除固定的可再生目录', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-clean-'))
		const generatedFiles = [
			'node_modules/package/file',
			'dist/assets/file',
			'src-tauri/target/debug/file',
			'.release-tmp/file',
		]
		const sourceFile = path.join(root, 'src', 'keep.ts')
		try {
			for (const relativePath of generatedFiles) {
				const filePath = path.join(root, relativePath)
				await mkdir(path.dirname(filePath), { recursive: true })
				await writeFile(filePath, 'generated')
			}
			await mkdir(path.dirname(sourceFile), { recursive: true })
			await writeFile(sourceFile, 'keep')

			await cleanGeneratedDirectories(root)

			for (const relativePath of ['node_modules', 'dist', 'src-tauri/target', '.release-tmp']) {
				expect(existsSync(path.join(root, relativePath))).toBe(false)
			}
			expect(existsSync(sourceFile)).toBe(true)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})
})
