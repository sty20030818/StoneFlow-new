import type { ReleaseChannel } from './types'
import { expandHomePath } from './paths'
import { assertHeroUiReleaseAuth } from './verify-heroui-pro'

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
	assertHeroUiReleaseAuth(sourceEnv)
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
	const postInstallEnv = { ...env }
	delete postInstallEnv.HEROUI_AUTH_TOKEN
	// npmmirror 没有 advisories bulk 接口，审计必须走 npm 官方源。
	await runner({
		argv: ['bun', 'audit'],
		cwd: input.sourceRoot,
		env: {
			...postInstallEnv,
			NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org',
		},
	})
	await runner({
		argv: ['bun', 'run', 'scripts/release/verify-heroui-pro.ts'],
		cwd: input.sourceRoot,
		env: postInstallEnv,
	})
	await runner({ argv: buildArgv, cwd: input.sourceRoot, env: postInstallEnv })
}
