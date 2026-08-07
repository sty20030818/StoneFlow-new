import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import { createReleasePaths } from './paths'

describe('createReleasePaths', () => {
	test('每轮 source、Cargo target 与 staged 输出都使用唯一目录', () => {
		const scriptDir = path.join(path.parse(process.cwd()).root, 'repo', 'scripts', 'release')
		const first = createReleasePaths({
			channel: 'beta',
			platformKey: 'darwin-aarch64',
			scriptDir,
		})
		const second = createReleasePaths({
			channel: 'beta',
			platformKey: 'darwin-aarch64',
			scriptDir,
		})

		expect(first.workDir).not.toBe(second.workDir)
		expect(first.sourceRoot).not.toBe(second.sourceRoot)
		expect(first.targetDir).not.toBe(second.targetDir)
		expect(first.tauriDist).not.toBe(second.tauriDist)
		expect(first.stagingDir).not.toBe(second.stagingDir)
	})
})
