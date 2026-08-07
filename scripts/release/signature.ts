import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

/** 使用与 Tauri updater 相同的 minisign-verify 实现验证已暂存产物。 */
export async function verifyUpdaterSignature(input: {
	repoRoot: string
	artifactPath: string
	signature: string
	publicKey: string
}) {
	const verifierManifest = path.join(input.repoRoot, 'src-tauri/crates/release-verifier/Cargo.toml')
	const child = Bun.spawn(
		[
			'cargo',
			'run',
			'--quiet',
			'--locked',
			'--manifest-path',
			verifierManifest,
			'--',
			input.artifactPath,
			input.signature,
			input.publicKey,
		],
		{ stdout: 'pipe', stderr: 'pipe' },
	)
	const [exitCode, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	])
	if (exitCode !== 0) {
		const detail = (stderr || stdout).trim()
		throw new Error(`updater 产物验签失败${detail ? `：${detail}` : ''}`)
	}
}

/** 验证内存中的远端 updater bytes，并确保临时明文总会被清理。 */
export async function verifyUpdaterSignatureBytes(input: {
	repoRoot: string
	artifactBytes: Uint8Array
	signature: string
	publicKey: string
}) {
	const directory = await mkdtemp(path.join(tmpdir(), 'stoneflow-updater-verify-'))
	const artifactPath = path.join(directory, 'updater.bin')
	try {
		await writeFile(artifactPath, input.artifactBytes, { mode: 0o600 })
		await verifyUpdaterSignature({
			repoRoot: input.repoRoot,
			artifactPath,
			signature: input.signature,
			publicKey: input.publicKey,
		})
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
}
