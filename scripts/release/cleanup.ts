import { rm } from 'node:fs/promises'

type ReleaseRunPaths = {
	workDir: string
}

type ReleaseBuildWorkspacePaths = {
	sourceRoot: string
	targetDir: string
}

export function combineReleaseFailure(failure: unknown, cleanupFailure: unknown) {
	const message = failure instanceof Error ? failure.message : String(failure)
	const cleanupMessage =
		cleanupFailure instanceof Error ? cleanupFailure.message : String(cleanupFailure)
	return new AggregateError(
		[failure, cleanupFailure],
		`${message}；同时清理发布临时目录失败：${cleanupMessage}`,
	)
}

/** 删除本轮全部可再生输出；唯一 run 目录保证不会影响并发或历史产物。 */
export async function cleanupReleaseRun({ workDir }: ReleaseRunPaths) {
	await rm(workDir, { recursive: true, force: true })
}

/** 构建结束后只删除 clone 与 Cargo 输出，保留已经收集到 staged 的产物。 */
export async function cleanupReleaseBuildWorkspace({
	sourceRoot,
	targetDir,
}: ReleaseBuildWorkspacePaths) {
	await Promise.all([
		rm(sourceRoot, { recursive: true, force: true }),
		rm(targetDir, { recursive: true, force: true }),
	])
}
