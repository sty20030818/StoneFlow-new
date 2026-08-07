import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { collectReleaseArtifacts } from './artifacts'
import { OTHER_UPDATER_SIGNER, TEST_UPDATER_SIGNER } from './signature-test-fixture'

const tempDirs: string[] = []
const REPO_ROOT = path.resolve(import.meta.dir, '../..')

async function createFixture() {
	const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-artifacts-'))
	tempDirs.push(root)
	return {
		tauriDist: path.join(root, 'bundle'),
		releaseVersionDir: path.join(root, 'output', 'updates', 'releases', '0.1.4-beta.4'),
		downloadsVersionDir: path.join(root, 'output', 'downloads', '0.1.4-beta.4'),
	}
}

function sha256(bytes: Uint8Array) {
	return createHash('sha256').update(bytes).digest('hex')
}

async function writeSignedArtifact(
	directory: string,
	fileName: string,
	bytes: Uint8Array,
	signer = TEST_UPDATER_SIGNER,
) {
	const signature = signer.sign(fileName, bytes)
	await mkdir(directory, { recursive: true })
	await writeFile(path.join(directory, fileName), bytes)
	await writeFile(path.join(directory, `${fileName}.sig`), signature)
	return signature
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('collectReleaseArtifacts', () => {
	test('Windows updater 与手动安装复用同一内容寻址对象和 URL', async () => {
		const paths = await createFixture()
		const version = '0.1.4-beta.4'
		const platformKey = 'windows-x86_64'
		const fileName = `StoneFlow_${version}_x64-setup.exe`
		const bytes = Buffer.from('windows-installer')
		const digest = sha256(bytes)
		const nsisDir = path.join(paths.tauriDist, 'nsis')
		const signature = await writeSignedArtifact(nsisDir, fileName, bytes)

		const collected = await collectReleaseArtifacts({
			channel: 'beta',
			platformKey,
			version,
			tauriDist: paths.tauriDist,
			releaseVersionDir: paths.releaseVersionDir,
			downloadsVersionDir: paths.downloadsVersionDir,
			publicUrl: 'https://release.example/stoneflow',
			updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
			repoRoot: REPO_ROOT,
		})

		const key =
			`stoneflow/updates/beta/releases/${version}/platforms/${platformKey}` +
			`/artifacts/${digest}/${fileName}`
		const url = `https://release.example/stoneflow/${key.slice('stoneflow/'.length)}`
		expect(collected.updater).toEqual({ url, signature, sha256: digest })
		expect(collected.downloads).toEqual([{ kind: 'nsis', url, sha256: digest }])
		expect(collected.uploadItems.map((item) => item.key)).toEqual([key])
		expect(await readFile(collected.uploadItems[0]!.filePath)).toEqual(bytes)
	})

	test('不同的 macOS updater 与 DMG 分别按内容摘要寻址且不上传 sidecar 或 mutable alias', async () => {
		const paths = await createFixture()
		const version = '0.1.4-beta.4'
		const platformKey = 'darwin-aarch64'
		const updaterSourceName = 'StoneFlow.app.tar.gz'
		const updaterTargetName = `StoneFlow_${version}_aarch64.app.tar.gz`
		const dmgName = `StoneFlow_${version}_aarch64.dmg`
		const updaterBytes = Buffer.from('mac-updater')
		const dmgBytes = Buffer.from('mac-installer')
		const updaterDigest = sha256(updaterBytes)
		const dmgDigest = sha256(dmgBytes)
		await mkdir(path.join(paths.tauriDist, 'macos'), { recursive: true })
		await mkdir(path.join(paths.tauriDist, 'dmg'), { recursive: true })
		const signature = await writeSignedArtifact(
			path.join(paths.tauriDist, 'macos'),
			updaterSourceName,
			updaterBytes,
		)
		await writeFile(path.join(paths.tauriDist, 'dmg', dmgName), dmgBytes)

		const collected = await collectReleaseArtifacts({
			channel: 'beta',
			platformKey,
			version,
			tauriDist: paths.tauriDist,
			releaseVersionDir: paths.releaseVersionDir,
			downloadsVersionDir: paths.downloadsVersionDir,
			publicUrl: 'https://release.example/stoneflow',
			updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
			repoRoot: REPO_ROOT,
		})

		const updaterKey =
			`stoneflow/updates/beta/releases/${version}/platforms/${platformKey}` +
			`/artifacts/${updaterDigest}/${updaterTargetName}`
		const downloadKey = `stoneflow/downloads/beta/${platformKey}/${version}/${dmgDigest}/${dmgName}`
		expect(collected.uploadItems.map((item) => item.key)).toEqual([updaterKey, downloadKey])
		expect(collected.updater).toMatchObject({
			sha256: updaterDigest,
			signature,
		})
		expect(collected.downloads).toEqual([
			{
				kind: 'dmg',
				sha256: dmgDigest,
				url: `https://release.example/stoneflow/${downloadKey.slice('stoneflow/'.length)}`,
			},
		])
		expect(collected.uploadItems.every((item) => !item.key.endsWith('.sig'))).toBeTrue()
		expect(collected.uploadItems.every((item) => !/\/latest(?:[.-]|$)/.test(item.key))).toBeTrue()
	})

	test('只有其他操作系统产物时拒绝伪装成当前平台发布', async () => {
		const paths = await createFixture()
		const version = '0.1.4-beta.4'
		const sourceName = 'StoneFlow.app.tar.gz'
		await writeSignedArtifact(
			path.join(paths.tauriDist, 'macos'),
			sourceName,
			Buffer.from('mac-updater'),
		)

		await expect(
			collectReleaseArtifacts({
				channel: 'beta',
				platformKey: 'windows-x86_64',
				version,
				tauriDist: paths.tauriDist,
				releaseVersionDir: paths.releaseVersionDir,
				downloadsVersionDir: paths.downloadsVersionDir,
				publicUrl: 'https://release.example/stoneflow',
				updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
				repoRoot: REPO_ROOT,
			}),
		).rejects.toThrow('未找到当前平台 updater 产物')
	})

	test.each([
		{
			name: 'Linux AppImage',
			platformKey: 'linux-x86_64',
			bundleDir: 'appimage',
			fileName: 'StoneFlow_0.1.4-beta.4_x64.AppImage.tar.gz',
			kind: 'appimage' as const,
		},
		{
			name: 'Windows MSI fallback',
			platformKey: 'windows-x86_64',
			bundleDir: 'msi',
			fileName: 'StoneFlow_0.1.4-beta.4_x64_en-US.msi',
			kind: 'msi' as const,
		},
	])('$name updater 与手动安装复用同一内容寻址对象', async (fixture) => {
		const paths = await createFixture()
		const version = '0.1.4-beta.4'
		const bytes = Buffer.from(fixture.name)
		const signature = await writeSignedArtifact(
			path.join(paths.tauriDist, fixture.bundleDir),
			fixture.fileName,
			bytes,
		)

		const collected = await collectReleaseArtifacts({
			channel: 'beta',
			platformKey: fixture.platformKey,
			version,
			tauriDist: paths.tauriDist,
			releaseVersionDir: paths.releaseVersionDir,
			downloadsVersionDir: paths.downloadsVersionDir,
			publicUrl: 'https://release.example/stoneflow',
			updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
			repoRoot: REPO_ROOT,
		})

		expect(collected.updater).toMatchObject({ signature, sha256: sha256(bytes) })
		expect(collected.downloads).toEqual([
			{ kind: fixture.kind, url: collected.updater.url, sha256: sha256(bytes) },
		])
		expect(collected.uploadItems).toHaveLength(1)
	})

	test('签名私钥与应用内置公钥不匹配时在发布前拒绝', async () => {
		const paths = await createFixture()
		const version = '0.1.4-beta.4'
		const fileName = `StoneFlow_${version}_x64-setup.exe`
		await writeSignedArtifact(
			path.join(paths.tauriDist, 'nsis'),
			fileName,
			Buffer.from('signed-by-the-wrong-key'),
			OTHER_UPDATER_SIGNER,
		)

		await expect(
			collectReleaseArtifacts({
				channel: 'beta',
				platformKey: 'windows-x86_64',
				version,
				tauriDist: paths.tauriDist,
				releaseVersionDir: paths.releaseVersionDir,
				downloadsVersionDir: paths.downloadsVersionDir,
				publicUrl: 'https://release.example/stoneflow',
				updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
				repoRoot: REPO_ROOT,
			}),
		).rejects.toThrow('updater 产物验签失败')
	})
})
