import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { cleanupReleaseBuildWorkspace, cleanupReleaseRun, combineReleaseFailure } from './cleanup'
import { runGit } from './git'

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i

export interface ReleaseBuildWorkspace {
	readonly sourceRoot: string
	readonly targetDir: string
	readonly releaseCommit: string
}

interface ReleaseBuildWorkspaceInput extends ReleaseBuildWorkspace {
	readonly repoRoot: string
	readonly workDir: string
}

/** 在独立 detached clone 中执行构建回调，避免可编辑 checkout 参与构建。 */
export async function withReleaseBuildWorkspace<T>(
	input: ReleaseBuildWorkspaceInput,
	build: (workspace: ReleaseBuildWorkspace) => Promise<T>,
) {
	if (!COMMIT_SHA_PATTERN.test(input.releaseCommit)) {
		throw new Error(`发布快照 commit 必须是完整 40 位 SHA，当前是 ${input.releaseCommit || '(空)'}`)
	}

	try {
		const gitControlDir = path.join(input.workDir, 'git-control')
		const gitConfig = path.join(gitControlDir, 'config')
		const gitTemplate = path.join(gitControlDir, 'template')
		await mkdir(gitTemplate, { recursive: true })
		await writeFile(gitConfig, '')
		const gitEnvironment = {
			GIT_CONFIG_GLOBAL: gitConfig,
			GIT_CONFIG_NOSYSTEM: '1',
			GIT_ATTR_NOSYSTEM: '1',
		}
		await runGit(
			input.repoRoot,
			[
				'clone',
				'--quiet',
				'--local',
				'--no-checkout',
				`--template=${gitTemplate}`,
				'--',
				input.repoRoot,
				input.sourceRoot,
			],
			gitEnvironment,
		)
		await runGit(
			input.sourceRoot,
			['checkout', '--quiet', '--force', '--detach', input.releaseCommit, '--'],
			gitEnvironment,
		)
		const snapshotCommit = (
			await runGit(input.sourceRoot, ['rev-parse', '--verify', 'HEAD^{commit}'], gitEnvironment)
		).trim()
		if (snapshotCommit !== input.releaseCommit) {
			throw new Error(
				`发布快照 HEAD ${snapshotCommit || '(空)'} 与目标 commit ${input.releaseCommit} 不一致`,
			)
		}
		const snapshotStatus = await runGit(
			input.sourceRoot,
			[
				'status',
				'--porcelain=v1',
				'--untracked-files=all',
				'--ignored=matching',
				'--ignore-submodules=none',
			],
			gitEnvironment,
		)
		if (snapshotStatus.length > 0) {
			throw new Error('发布快照 checkout 后包含 commit 之外的构建输入')
		}

		const result = await build({
			sourceRoot: input.sourceRoot,
			targetDir: input.targetDir,
			releaseCommit: snapshotCommit,
		})
		try {
			await cleanupReleaseBuildWorkspace(input)
		} catch (error) {
			console.warn(`构建已完成，但本地构建目录清理失败：${(error as Error).message}`)
		}
		return result
	} catch (error) {
		try {
			await cleanupReleaseRun(input)
		} catch (cleanupError) {
			throw combineReleaseFailure(error, cleanupError)
		}
		throw error
	}
}
