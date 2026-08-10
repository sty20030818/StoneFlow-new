/**
 * Feature public-surface boundary check（β-acl 终态）。
 *
 * ## 合法跨 feature import
 *
 * ```ts
 * from '@/features/<name>'            // 主入口
 * from '@/features/<name>/contract'   // 纯契约（无 React Page）
 * from '@/features/<name>/page'       // 仅页面（routes）
 * from '@/features/<name>/presentation' // 稳定展示契约
 * from '@/features/<name>/shortcut-contribution' // 组合根快捷键纯数据贡献
 * ```
 *
 * ## 禁止
 * - `@/features/<name>/api|hooks|model|components|…` 任意其它深路径
 * - 同 feature 内部深 import **允许**
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const FEATURES = [
	'task',
	'selection',
	'submit',
	'filter',
	'danger-confirm',
	'project',
	'space',
	'view',
	'lifecycle',
	'command',
	'settings',
	'entity-detail',
	'metadata-fields',
	'display-options',
	'bulk-action',
	'sync',
	'launcher',
	'global-search',
	'changelog',
	'update',
	'workspace',
	'activity',
	'project-overview',
	'shell-dialogs',
] as const

const STABLE_SUFFIXES = ['contract', 'page', 'presentation', 'shortcut-contribution'] as const
const SRC = join(import.meta.dir, '..', 'src')

type Violation = {
	file: string
	feature: string
	line: number
	text: string
}

function walkTsFiles(dir: string): string[] {
	const files: string[] = []
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)
		const stat = statSync(full)
		if (stat.isDirectory()) {
			if (name !== 'node_modules' && name !== 'dist') files.push(...walkTsFiles(full))
			continue
		}
		if (name.endsWith('.ts') || name.endsWith('.tsx')) files.push(full)
	}
	return files
}

function isInsideFeature(fileAbs: string, feature: string) {
	const pathInSrc = relative(SRC, fileAbs).replaceAll('\\', '/')
	return pathInSrc.startsWith(`features/${feature}/`) || pathInSrc === `features/${feature}`
}

function isLegalFeatureImportPath(feature: string, importPath: string) {
	const base = `@/features/${feature}`
	return importPath === base || STABLE_SUFFIXES.some((suffix) => importPath === `${base}/${suffix}`)
}

const violations: Violation[] = []
const importPatterns = [
	/from\s+['"](@\/features\/[^'"]+)['"]/g,
	/vi\.mock\(\s*['"](@\/features\/[^'"]+)['"]/g,
]

for (const file of walkTsFiles(SRC)) {
	const lines = readFileSync(file, 'utf8').split('\n')
	lines.forEach((line, index) => {
		for (const pattern of importPatterns) {
			pattern.lastIndex = 0
			for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
				const importPath = match[1]
				for (const feature of FEATURES) {
					const prefix = `@/features/${feature}`
					if (
						(importPath === prefix || importPath.startsWith(`${prefix}/`)) &&
						!isInsideFeature(file, feature) &&
						!isLegalFeatureImportPath(feature, importPath)
					) {
						violations.push({
							file: relative(join(SRC, '..'), file),
							feature,
							line: index + 1,
							text: line.trim(),
						})
					}
				}
			}
		}
	})
}

if (violations.length > 0) {
	console.error('Feature boundary violations:\n')
	for (const violation of violations) {
		console.error(`  ${violation.file}:${violation.line}`)
		console.error(`    ${violation.text}`)
		console.error(
			`    → 合法: @/features/${violation.feature} | …/contract | …/page | …/presentation | …/shortcut-contribution（禁止其它深路径）\n`,
		)
	}
	console.error(`Total: ${violations.length}`)
	process.exit(1)
}

console.log(
	`Feature boundaries OK (${FEATURES.length} features; entries: . | contract | page | presentation | shortcut-contribution).`,
)
