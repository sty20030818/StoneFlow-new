import { existsSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'

import { runGit } from './git'
import { createReleasePaths } from './paths'
import { withReleaseBuildWorkspace } from './workspace'

const tempDirs: string[] = []

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
	)
})

async function createRepository() {
	const repoRoot = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-workspace-'))
	tempDirs.push(repoRoot)
	await runGit(repoRoot, ['init', '--quiet'])
	await runGit(repoRoot, ['config', 'user.name', 'StoneFlow Test'])
	await runGit(repoRoot, ['config', 'user.email', 'stoneflow@example.test'])
	await writeFile(path.join(repoRoot, '.gitignore'), '.release-tmp/\n')
	await writeFile(path.join(repoRoot, 'source.txt'), 'committed\n')
	await runGit(repoRoot, ['add', '--', '.gitignore', 'source.txt'])
	await runGit(repoRoot, ['commit', '--quiet', '-m', 'fixture'])
	const releaseCommit = (await runGit(repoRoot, ['rev-parse', '--verify', 'HEAD^{commit}'])).trim()
	return { repoRoot, releaseCommit }
}

function releasePaths(repoRoot: string, runId: string) {
	return createReleasePaths({
		channel: 'stable',
		platformKey: 'darwin-aarch64',
		scriptDir: path.join(repoRoot, 'scripts', 'release'),
		runId,
	})
}

describe('withReleaseBuildWorkspace', () => {
	test('checkout 在构建回调期间改后恢复，快照仍只读取 release commit', async () => {
		const { repoRoot, releaseCommit } = await createRepository()
		const paths = releasePaths(repoRoot, 'snapshot-test')
		let snapshotSource = ''
		let snapshotHead = ''

		await withReleaseBuildWorkspace({ ...paths, releaseCommit }, async ({ sourceRoot }) => {
			const checkoutSource = path.join(repoRoot, 'source.txt')
			await writeFile(checkoutSource, 'temporarily edited\n')
			try {
				snapshotSource = await readFile(path.join(sourceRoot, 'source.txt'), 'utf8')
				snapshotHead = (await runGit(sourceRoot, ['rev-parse', '--verify', 'HEAD^{commit}'])).trim()
			} finally {
				await writeFile(checkoutSource, 'committed\n')
			}
			await mkdir(path.dirname(path.join(paths.stagingDir, 'artifact.bin')), {
				recursive: true,
			})
			await writeFile(path.join(paths.stagingDir, 'artifact.bin'), 'artifact')
		})

		expect(snapshotSource).toBe('committed\n')
		expect(snapshotHead).toBe(releaseCommit)
		expect(existsSync(paths.sourceRoot)).toBe(false)
		expect(existsSync(path.join(paths.stagingDir, 'artifact.bin'))).toBe(true)
	})

	test('构建失败只清理本轮目录，不影响另一个 run', async () => {
		const { repoRoot, releaseCommit } = await createRepository()
		const failed = releasePaths(repoRoot, 'failed-run')
		const other = releasePaths(repoRoot, 'other-run')
		const otherArtifact = path.join(other.stagingDir, 'artifact.bin')
		await mkdir(path.dirname(otherArtifact), { recursive: true })
		await writeFile(otherArtifact, 'keep')

		await expect(
			withReleaseBuildWorkspace({ ...failed, releaseCommit }, async ({ targetDir }) => {
				await mkdir(targetDir, { recursive: true })
				await mkdir(failed.stagingDir, { recursive: true })
				throw new Error('build failed')
			}),
		).rejects.toThrow('build failed')

		expect(existsSync(failed.workDir)).toBe(false)
		expect(existsSync(otherArtifact)).toBe(true)
	})

	test('隔离 checkout 不执行继承的 hook 或全局 clean/smudge filter', async () => {
		const { repoRoot, releaseCommit } = await createRepository()
		const paths = releasePaths(repoRoot, 'hook-test')
		const hooksDir = path.join(repoRoot, 'global-hooks')
		const globalConfig = path.join(repoRoot, 'global.gitconfig')
		const globalAttributes = path.join(repoRoot, 'global.gitattributes')
		const smudgeFilter = path.join(repoRoot, 'smudge-filter')
		const cleanFilter = path.join(repoRoot, 'clean-filter')
		await mkdir(hooksDir)
		await writeFile(
			path.join(hooksDir, 'post-checkout'),
			"#!/bin/sh\nprintf 'hooked\\n' > source.txt\n",
		)
		await chmod(path.join(hooksDir, 'post-checkout'), 0o755)
		await writeFile(globalAttributes, 'source.txt filter=swap\n')
		await writeFile(smudgeFilter, "#!/bin/sh\nsed 's/committed/filtered/'\n")
		await writeFile(cleanFilter, "#!/bin/sh\nsed 's/filtered/committed/'\n")
		await chmod(smudgeFilter, 0o755)
		await chmod(cleanFilter, 0o755)
		await writeFile(
			globalConfig,
			`[core]\n\thooksPath = ${hooksDir}\n\tattributesFile = ${globalAttributes}\n[filter "swap"]\n\tsmudge = ${smudgeFilter}\n\tclean = ${cleanFilter}\n`,
		)
		const previousGlobalConfig = process.env.GIT_CONFIG_GLOBAL
		const injectedGitConfig = {
			GIT_CONFIG_COUNT: '3',
			GIT_CONFIG_KEY_0: 'core.attributesFile',
			GIT_CONFIG_VALUE_0: globalAttributes,
			GIT_CONFIG_KEY_1: 'filter.swap.smudge',
			GIT_CONFIG_VALUE_1: smudgeFilter,
			GIT_CONFIG_KEY_2: 'filter.swap.clean',
			GIT_CONFIG_VALUE_2: cleanFilter,
		}
		const previousInjectedConfig = Object.fromEntries(
			Object.keys(injectedGitConfig).map((name) => [name, process.env[name]]),
		)
		process.env.GIT_CONFIG_GLOBAL = globalConfig
		Object.assign(process.env, injectedGitConfig)
		try {
			await withReleaseBuildWorkspace({ ...paths, releaseCommit }, async ({ sourceRoot }) => {
				expect(await readFile(path.join(sourceRoot, 'source.txt'), 'utf8')).toBe('committed\n')
			})
		} finally {
			if (previousGlobalConfig === undefined) delete process.env.GIT_CONFIG_GLOBAL
			else process.env.GIT_CONFIG_GLOBAL = previousGlobalConfig
			for (const [name, value] of Object.entries(previousInjectedConfig)) {
				if (value === undefined) delete process.env[name]
				else process.env[name] = value
			}
		}
	})
})
