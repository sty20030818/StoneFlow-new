import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'

import { verifyHeroUiProInstallation } from './verify-heroui-pro'

const tempDirs: string[] = []

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe('verifyHeroUiProInstallation', () => {
	test('接受版本一致且必需入口完整的私有产物', async () => {
		const root = await createFixture()
		await expect(verifyHeroUiProInstallation(root)).resolves.toBeUndefined()
	})

	test('接受声明范围内的 frozen lock 版本', async () => {
		const root = await createFixture({ installedVersion: '1.0.0-beta.9' })
		await expect(verifyHeroUiProInstallation(root)).resolves.toBeUndefined()
	})

	test('缺少真实组件入口时拒绝 public bootstrap', async () => {
		const root = await createFixture()
		await rm(path.join(root, 'node_modules/@heroui-pro/react/dist/components/sheet/index.js'))
		await expect(verifyHeroUiProInstallation(root)).rejects.toThrow()
	})

	test('入口无法加载时拒绝构建', async () => {
		const root = await createFixture()
		await writeFile(
			path.join(root, 'node_modules/@heroui-pro/react/dist/components/list-view/index.js'),
			'export {',
		)
		await expect(verifyHeroUiProInstallation(root)).rejects.toThrow('无法加载')
	})

	test('安装版本偏离声明时拒绝构建', async () => {
		const root = await createFixture({ installedVersion: '2.0.0' })
		await expect(verifyHeroUiProInstallation(root)).rejects.toThrow('与 package.json 声明')
	})
})

async function createFixture(options: { installedVersion?: string } = {}) {
	const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-heroui-pro-'))
	tempDirs.push(root)
	const packageRoot = path.join(root, 'node_modules/@heroui-pro/react')
	await Promise.all([
		mkdir(path.join(packageRoot, 'dist/components/list-view'), { recursive: true }),
		mkdir(path.join(packageRoot, 'dist/components/sheet'), { recursive: true }),
	])
	await writeFile(
		path.join(root, 'package.json'),
		JSON.stringify({ dependencies: { '@heroui-pro/react': '^1.0.0-beta.8' } }),
	)
	await writeFile(
		path.join(packageRoot, 'package.json'),
		JSON.stringify({
			name: '@heroui-pro/react',
			version: options.installedVersion ?? '1.0.0-beta.8',
			exports: {
				'.': { import: './dist/index.js' },
				'./list-view': { import: './dist/components/list-view/index.js' },
				'./sheet': { import: './dist/components/sheet/index.js' },
			},
		}),
	)
	await Promise.all([
		writeFile(path.join(packageRoot, 'dist/index.js'), 'export const Sheet = {}\n'),
		writeFile(path.join(packageRoot, 'dist/components/list-view/index.js'), 'export {}\n'),
		writeFile(path.join(packageRoot, 'dist/components/sheet/index.js'), 'export {}\n'),
	])
	return root
}
