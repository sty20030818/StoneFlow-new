import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import { resetLocalReleaseOutputs } from './cleanup'

describe('resetLocalReleaseOutputs', () => {
	test('只清理可再生发布输出', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-cleanup-'))
		const workDir = path.join(root, '.release-tmp')
		const tauriDist = path.join(root, 'target', 'release', 'bundle')
		const bundleOutput = path.join(tauriDist, 'dmg', 'StoneFlow.dmg')
		const unrelatedFile = path.join(root, 'target', 'release', 'cache', 'keep.txt')
		try {
			await mkdir(path.dirname(bundleOutput), { recursive: true })
			await mkdir(path.dirname(unrelatedFile), { recursive: true })
			await mkdir(workDir, { recursive: true })
			await writeFile(bundleOutput, 'artifact')
			await writeFile(unrelatedFile, 'keep')

			await resetLocalReleaseOutputs({ workDir, tauriDist })

			expect(existsSync(workDir)).toBe(false)
			expect(existsSync(path.dirname(bundleOutput))).toBe(false)
			expect(existsSync(unrelatedFile)).toBe(true)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})
})
