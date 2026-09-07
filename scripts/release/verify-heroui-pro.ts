import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const PACKAGE_NAME = '@heroui-pro/react'
const REQUIRED_EXPORTS = ['.', './list-view', './sheet'] as const

type PackageManifest = {
	name?: unknown
	version?: unknown
	dependencies?: Record<string, unknown>
	exports?: Record<string, unknown>
}

export function assertHeroUiReleaseAuth(env: NodeJS.ProcessEnv) {
	if (!env.HEROUI_AUTH_TOKEN?.trim()) {
		throw new Error('正式发布缺少 HEROUI_AUTH_TOKEN，无法取得 HeroUI Pro 私有产物')
	}
}

export async function verifyHeroUiProInstallation(projectRoot: string) {
	const packageRoot = path.join(projectRoot, 'node_modules', '@heroui-pro', 'react')
	const [projectManifest, installedManifest] = await Promise.all([
		readManifest(path.join(projectRoot, 'package.json')),
		readManifest(path.join(packageRoot, 'package.json')),
	])

	if (installedManifest.name !== PACKAGE_NAME || typeof installedManifest.version !== 'string') {
		throw new Error('HeroUI Pro 安装产物缺少有效的包名或版本')
	}

	const declaredVersion = projectManifest.dependencies?.[PACKAGE_NAME]
	if (
		typeof declaredVersion !== 'string' ||
		!Bun.semver.satisfies(installedManifest.version, declaredVersion)
	) {
		throw new Error(
			`HeroUI Pro 安装版本 ${installedManifest.version} 与 package.json 声明 ${String(declaredVersion)} 不一致`,
		)
	}

	for (const exportName of REQUIRED_EXPORTS) {
		const entry = resolveImportEntry(installedManifest.exports?.[exportName], exportName)
		const entryPath = path.resolve(packageRoot, entry)
		if (!entryPath.startsWith(`${packageRoot}${path.sep}`)) {
			throw new Error(`HeroUI Pro export ${exportName} 指向包目录外`)
		}
		await assertNonEmptyFile(entryPath, exportName)
		try {
			await import(pathToFileURL(entryPath).href)
		} catch {
			throw new Error(`HeroUI Pro export ${exportName} 无法加载`)
		}
	}
}

async function assertNonEmptyFile(filePath: string, exportName: string) {
	try {
		if ((await stat(filePath)).size > 0) return
	} catch {
		// 统一成 release 可操作的错误，不暴露底层路径细节。
	}
	throw new Error(`HeroUI Pro export ${exportName} 缺失或为空`)
}

async function readManifest(filePath: string): Promise<PackageManifest> {
	try {
		return JSON.parse(await readFile(filePath, 'utf8')) as PackageManifest
	} catch {
		throw new Error(`${filePath} 不是可读取的 package.json`)
	}
}

function resolveImportEntry(value: unknown, exportName: string) {
	const entry =
		typeof value === 'string'
			? value
			: value && typeof value === 'object' && 'import' in value
				? (value as { import?: unknown }).import
				: null
	if (typeof entry !== 'string' || !entry.startsWith('./')) {
		throw new Error(`HeroUI Pro 缺少 ${exportName} 的 import entry`)
	}
	return entry
}

if (import.meta.main) {
	await verifyHeroUiProInstallation(path.resolve(import.meta.dir, '../..'))
}
