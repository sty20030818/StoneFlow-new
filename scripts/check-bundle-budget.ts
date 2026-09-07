import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

type EntryBudget = {
	htmlFile: 'index.html' | 'launcher.html'
	totalRawBytes: number
	totalGzipBytes: number
	maxInitialRawBytes: number
	maxInitialGzipBytes: number
}

export type InitialJavaScriptFile = {
	path: string
	rawBytes: number
	gzipBytes: number
}

export type EntryMeasurement = {
	htmlFile: string
	files: readonly InitialJavaScriptFile[]
	totalRawBytes: number
	totalGzipBytes: number
	maxInitialRawBytes: number
	maxInitialGzipBytes: number
}

export type BundleBudgetReport = {
	entries: readonly EntryMeasurement[]
	assets: readonly { path: string; bytes: number; budgetBytes: number }[]
}

// 2026-09-07 优化后 production 基线：
// Main 1,672,326 / 516,817 B，单文件 705,907 / 207,285 B（raw / gzip）。
// Launcher 575,585 / 181,696 B，单文件 286,211 / 90,117 B。
// 预算保留约 3.4%–5.4% 余量，超出后必须显式复核初始依赖图。
const ENTRY_BUDGETS: readonly EntryBudget[] = [
	{
		htmlFile: 'index.html',
		totalRawBytes: 1_730_000,
		totalGzipBytes: 535_000,
		maxInitialRawBytes: 730_000,
		maxInitialGzipBytes: 215_000,
	},
	{
		htmlFile: 'launcher.html',
		totalRawBytes: 600_000,
		totalGzipBytes: 190_000,
		maxInitialRawBytes: 300_000,
		maxInitialGzipBytes: 95_000,
	},
]

const ASSET_BUDGETS = [
	{ path: 'avatar.jpg', budgetBytes: 7_000 },
	{ path: 'StoneFlow.png', budgetBytes: 22_000 },
] as const

function attribute(tag: string, name: string) {
	const match = tag.match(
		new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\u0060]+))`, 'i'),
	)
	return match?.[1] ?? match?.[2] ?? match?.[3]
}

function isJavaScriptReference(reference: string) {
	return reference.split(/[?#]/, 1)[0]?.toLowerCase().endsWith('.js') ?? false
}

export function collectInitialJavaScriptReferences(html: string, htmlFile = 'HTML') {
	const entryScripts: string[] = []
	const modulePreloads: string[] = []

	for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
		const tag = match[0]
		if (match[1]?.toLowerCase() === 'script') {
			const source = attribute(tag, 'src')
			if (
				attribute(tag, 'type')?.toLowerCase() === 'module' &&
				source &&
				isJavaScriptReference(source)
			) {
				entryScripts.push(source)
			}
			continue
		}

		const href = attribute(tag, 'href')
		const relations = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? []
		if (relations.includes('modulepreload') && href && isJavaScriptReference(href)) {
			modulePreloads.push(href)
		}
	}

	if (entryScripts.length === 0) throw new Error(`${htmlFile} 缺少 module 入口 script`)
	return [...new Set([...entryScripts, ...modulePreloads])]
}

function resolveDistAsset(distDir: string, reference: string) {
	const pathWithoutQuery = reference.split(/[?#]/, 1)[0] ?? reference
	if (/^[a-z][a-z\d+.-]*:/i.test(pathWithoutQuery) || pathWithoutQuery.startsWith('//')) {
		throw new Error(`初始 JS 必须是 dist 内本地文件：${reference}`)
	}

	const root = resolve(distDir)
	const absolutePath = resolve(root, decodeURIComponent(pathWithoutQuery).replace(/^\/+/, ''))
	const relativePath = relative(root, absolutePath)
	if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
		throw new Error(`初始 JS 超出 dist：${reference}`)
	}
	return { absolutePath, relativePath: relativePath.replaceAll('\\', '/') }
}

export async function measureEntryInitialJavaScript(
	distDir: string,
	htmlFile: string,
): Promise<EntryMeasurement> {
	const html = await readFile(resolve(distDir, htmlFile), 'utf8')
	const references = collectInitialJavaScriptReferences(html, htmlFile)
	const files = await Promise.all(
		references.map(async (reference): Promise<InitialJavaScriptFile> => {
			const { absolutePath, relativePath } = resolveDistAsset(distDir, reference)
			const bytes = await readFile(absolutePath)
			return {
				path: relativePath,
				rawBytes: bytes.byteLength,
				gzipBytes: gzipSync(bytes).byteLength,
			}
		}),
	)

	return {
		htmlFile,
		files,
		totalRawBytes: files.reduce((total, file) => total + file.rawBytes, 0),
		totalGzipBytes: files.reduce((total, file) => total + file.gzipBytes, 0),
		maxInitialRawBytes: Math.max(...files.map((file) => file.rawBytes)),
		maxInitialGzipBytes: Math.max(...files.map((file) => file.gzipBytes)),
	}
}

export function entryBudgetViolations(measurement: EntryMeasurement, budget: EntryBudget) {
	const limits = [
		['initial JS raw 总量', measurement.totalRawBytes, budget.totalRawBytes],
		['initial JS gzip 总量', measurement.totalGzipBytes, budget.totalGzipBytes],
		['最大单 initial JS raw', measurement.maxInitialRawBytes, budget.maxInitialRawBytes],
		['最大单 initial JS gzip', measurement.maxInitialGzipBytes, budget.maxInitialGzipBytes],
	] as const

	return limits
		.filter(([, actual, maximum]) => actual > maximum)
		.map(
			([label, actual, maximum]) =>
				`${measurement.htmlFile} ${label} ${formatBytes(actual)} > ${formatBytes(maximum)}`,
		)
}

export async function checkBundleBudget(
	distDir = resolve(import.meta.dir, '..', 'dist'),
): Promise<BundleBudgetReport> {
	const entries = await Promise.all(
		ENTRY_BUDGETS.map(({ htmlFile }) => measureEntryInitialJavaScript(distDir, htmlFile)),
	)
	const violations = entries.flatMap((entry, index) =>
		entryBudgetViolations(entry, ENTRY_BUDGETS[index]!),
	)
	const assets = await Promise.all(
		ASSET_BUDGETS.map(async ({ path, budgetBytes }) => ({
			path,
			bytes: (await readFile(resolve(distDir, path))).byteLength,
			budgetBytes,
		})),
	)
	for (const asset of assets) {
		if (asset.bytes > asset.budgetBytes) {
			violations.push(
				`${asset.path} ${formatBytes(asset.bytes)} > ${formatBytes(asset.budgetBytes)}`,
			)
		}
	}

	if (violations.length > 0) {
		throw new Error(`Bundle 预算超限：\n${violations.map((line) => `- ${line}`).join('\n')}`)
	}
	return { entries, assets }
}

function formatBytes(bytes: number) {
	return `${bytes.toLocaleString('en-US')} B`
}

export function formatBundleBudgetReport(report: BundleBudgetReport) {
	return [
		...report.entries.map(
			(entry) =>
				`${entry.htmlFile}: ${entry.files.length} initial JS, raw ${formatBytes(entry.totalRawBytes)}, gzip ${formatBytes(entry.totalGzipBytes)}, max raw ${formatBytes(entry.maxInitialRawBytes)}, max gzip ${formatBytes(entry.maxInitialGzipBytes)}`,
		),
		...report.assets.map(
			(asset) => `${asset.path}: ${formatBytes(asset.bytes)} / ${formatBytes(asset.budgetBytes)}`,
		),
	].join('\n')
}

if (import.meta.main) {
	console.log(formatBundleBudgetReport(await checkBundleBudget()))
}
