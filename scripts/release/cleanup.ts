import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'

import { chalk } from './io'
import { BUNDLE_OUTPUT_DIRS } from './paths'

type LocalReleaseOutputPaths = {
	workDir: string
	tauriDist: string
}

/** 只处理可再生的本地发布输出，不触及源码、应用数据或远端文件。 */
export async function resetLocalReleaseOutputs(paths: LocalReleaseOutputPaths) {
	console.log(chalk.gray('\n🧹 检查并清理本地发布输出...\n'))
	const outputDirs = [
		paths.workDir,
		...BUNDLE_OUTPUT_DIRS.map((dirName) => path.join(paths.tauriDist, dirName)),
	]

	for (const dir of outputDirs) {
		if (!existsSync(dir)) continue
		await rm(dir, { recursive: true, force: true })
		console.log(chalk.green(`   clean ${dir}`))
	}
}
