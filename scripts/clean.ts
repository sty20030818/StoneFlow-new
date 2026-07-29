import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'

const GENERATED_DIRECTORIES = ['node_modules', 'dist', 'src-tauri/target', '.release-tmp'] as const

/** 清理仓库内可再生的依赖与构建输出。 */
export async function cleanGeneratedDirectories(repoRoot: string) {
	for (const relativePath of GENERATED_DIRECTORIES) {
		const directory = path.resolve(repoRoot, relativePath)
		if (!directory.startsWith(`${repoRoot}${path.sep}`)) {
			throw new Error(`拒绝清理仓库外路径: ${directory}`)
		}
		if (!existsSync(directory)) {
			console.log(`skip  ${relativePath}/`)
			continue
		}
		await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
		console.log(`clean ${relativePath}/`)
	}
}

if (import.meta.main) {
	await cleanGeneratedDirectories(path.resolve(import.meta.dir, '..'))
}
