import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import { cleanupReleaseBuildWorkspace, cleanupReleaseRun, combineReleaseFailure } from './cleanup'

describe('release cleanup', () => {
	test('清理失败保留原始失败作为首因', () => {
		const original = new Error('build failed')
		const cleanup = new Error('directory locked')
		const combined = combineReleaseFailure(original, cleanup)

		expect(combined.errors).toEqual([original, cleanup])
		expect(combined.message).toContain('build failed')
		expect(combined.message).toContain('directory locked')
	})

	test('成功收集后只清理 clone 与 Cargo 输出并保留 staged', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-cleanup-'))
		const sourceRoot = path.join(root, 'source')
		const targetDir = path.join(root, 'target')
		const stagedFile = path.join(root, 'staged', 'artifact.bin')
		try {
			await Promise.all([
				mkdir(sourceRoot, { recursive: true }),
				mkdir(targetDir, { recursive: true }),
				mkdir(path.dirname(stagedFile), { recursive: true }),
			])
			await writeFile(stagedFile, 'artifact')

			await cleanupReleaseBuildWorkspace({ sourceRoot, targetDir })

			expect(existsSync(sourceRoot)).toBe(false)
			expect(existsSync(targetDir)).toBe(false)
			expect(existsSync(stagedFile)).toBe(true)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	test('只删除指定 run，不影响其它并发 run', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-cleanup-'))
		const currentRun = path.join(root, 'current')
		const otherRunFile = path.join(root, 'other', 'staged', 'artifact.bin')
		try {
			await mkdir(currentRun, { recursive: true })
			await mkdir(path.dirname(otherRunFile), { recursive: true })
			await writeFile(otherRunFile, 'keep')

			await cleanupReleaseRun({ workDir: currentRun })

			expect(existsSync(currentRun)).toBe(false)
			expect(existsSync(otherRunFile)).toBe(true)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})
})
