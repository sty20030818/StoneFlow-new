import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'

import { buildReleaseApp, type BuildCommand } from './build'

const tempDirs: string[] = []

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true })))
})

function captureCommand() {
	const commands: BuildCommand[] = []
	return {
		runner: async (next: BuildCommand) => {
			commands.push(next)
		},
		commands,
	}
}

describe('buildReleaseApp', () => {
	test('Stable 使用普通 Tauri build', async () => {
		const captured = captureCommand()
		await buildReleaseApp(
			{
				channel: 'stable',
				platformKey: 'windows-x86_64',
				version: '0.1.4',
				sourceRoot: '/snapshot',
				targetDir: '/run/target',
				env: {
					KEEP: 'yes',
					Tauri_Config: '{"plugins":{"updater":{"pubkey":"wrong"}}}',
					cargo_target_dir: '/shared/target',
					pwd: '/editable-checkout',
					init_cwd: '/editable-checkout',
				},
			},
			captured.runner,
		)

		expect(captured.commands.map(({ argv }) => argv)).toEqual([
			['bun', 'install', '--frozen-lockfile'],
			['bun', 'run', 'tauri', 'build'],
		])
		for (const command of captured.commands) {
			expect(command.cwd).toBe('/snapshot')
			expect(command.env).toEqual({
				KEEP: 'yes',
				CARGO_TARGET_DIR: '/run/target',
				PWD: '/snapshot',
				INIT_CWD: '/snapshot',
			})
		}
	})

	test('Beta 通过 --config 覆盖版本且不改写 tauri.conf.json', async () => {
		const sourceRoot = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-build-'))
		tempDirs.push(sourceRoot)
		const configPath = path.join(sourceRoot, 'tauri.conf.json')
		const source = '{\n  "version": "0.1.3"\n}\n'
		await writeFile(configPath, source)
		const captured = captureCommand()

		await buildReleaseApp(
			{
				channel: 'beta',
				platformKey: 'darwin-aarch64',
				version: '0.1.4-beta.4',
				sourceRoot,
				targetDir: path.join(sourceRoot, 'target'),
				env: {},
			},
			captured.runner,
		)

		expect(captured.commands[1]?.argv).toEqual([
			'bun',
			'run',
			'tauri',
			'build',
			'--config',
			'{"version":"0.1.4-beta.4"}',
		])
		expect(await readFile(configPath, 'utf8')).toBe(source)
	})

	test('Windows Beta 只构建 NSIS', async () => {
		const captured = captureCommand()
		await buildReleaseApp(
			{
				channel: 'beta',
				platformKey: 'windows-x86_64',
				version: '0.1.4-beta.4',
				sourceRoot: '/snapshot',
				targetDir: '/run/target',
				env: {},
			},
			captured.runner,
		)

		expect(captured.commands[1]?.argv).toEqual([
			'bun',
			'run',
			'tauri',
			'build',
			'--config',
			'{"version":"0.1.4-beta.4"}',
			'--bundles',
			'nsis',
		])
	})

	test('展开签名私钥路径并保持调用方环境不变', async () => {
		const captured = captureCommand()
		const env = {
			TAURI_SIGNING_PRIVATE_KEY_PATH: '~/.tauri/stoneflow.key',
			TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'secret',
			KEEP: 'yes',
		}
		await buildReleaseApp(
			{
				channel: 'stable',
				platformKey: 'darwin-aarch64',
				version: '0.1.4',
				sourceRoot: '/snapshot',
				targetDir: '/run/target',
				env,
			},
			captured.runner,
		)

		expect(captured.commands[1]?.env).toEqual({
			...env,
			CARGO_TARGET_DIR: '/run/target',
			PWD: '/snapshot',
			INIT_CWD: '/snapshot',
			TAURI_SIGNING_PRIVATE_KEY: path.join(homedir(), '.tauri/stoneflow.key'),
		})
		expect(env).not.toHaveProperty('TAURI_SIGNING_PRIVATE_KEY')
	})
})
