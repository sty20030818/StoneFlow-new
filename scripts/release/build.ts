import type { ReleaseChannel } from './types'
import { expandHomePath } from './paths'

export interface BuildCommand {
	readonly argv: readonly string[]
	readonly cwd: string
	readonly env: NodeJS.ProcessEnv
}

export type BuildRunner = (command: BuildCommand) => Promise<void>

export interface BuildReleaseAppInput {
	readonly channel: ReleaseChannel
	readonly platformKey: string
	readonly version: string
	readonly sourceRoot: string
	readonly targetDir: string
	readonly env?: NodeJS.ProcessEnv
}

const runBuildCommand: BuildRunner = async ({ argv, cwd, env }) => {
	const child = Bun.spawn([...argv], {
		cwd,
		env,
		stdin: 'inherit',
		stdout: 'inherit',
		stderr: 'inherit',
	})
	const exitCode = await child.exited
	if (exitCode !== 0) throw new Error(`${argv.join(' ')} 失败，退出码: ${exitCode}`)
}

export async function buildReleaseApp(
	input: BuildReleaseAppInput,
	runner: BuildRunner = runBuildCommand,
) {
	const buildArgv = ['bun', 'run', 'tauri', 'build']
	if (input.channel === 'beta') {
		buildArgv.push('--config', JSON.stringify({ version: input.version }))
		if (input.platformKey.startsWith('windows-')) buildArgv.push('--bundles', 'nsis')
	}

	const sourceEnv = input.env ?? process.env
	const env: NodeJS.ProcessEnv = { ...sourceEnv }
	const controlledKeys = new Set(['TAURI_CONFIG', 'CARGO_TARGET_DIR', 'PWD', 'INIT_CWD'])
	for (const name of Object.keys(env)) {
		if (controlledKeys.has(name.toUpperCase())) delete env[name]
	}
	Object.assign(env, {
		CARGO_TARGET_DIR: input.targetDir,
		PWD: input.sourceRoot,
		INIT_CWD: input.sourceRoot,
	})
	const signingPrivateKey = expandHomePath(
		sourceEnv.TAURI_SIGNING_PRIVATE_KEY ?? sourceEnv.TAURI_SIGNING_PRIVATE_KEY_PATH,
	)
	if (signingPrivateKey) env.TAURI_SIGNING_PRIVATE_KEY = signingPrivateKey

	await runner({ argv: ['bun', 'install', '--frozen-lockfile'], cwd: input.sourceRoot, env })
	await runner({ argv: buildArgv, cwd: input.sourceRoot, env })
}
