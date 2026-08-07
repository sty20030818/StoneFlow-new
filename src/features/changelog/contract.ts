/** Changelog 唯一语法契约：纯解析、校验、版本比较与区间选择。 */

export const CHANGELOG_CATEGORIES = ['新增', '变更', '弃用', '移除', '修复', '安全'] as const

export type ChangelogCategory = (typeof CHANGELOG_CATEGORIES)[number]
export type ChangelogChannel = 'stable' | 'beta'

export interface ChangelogRelease {
	readonly version: string
	readonly date: string
	readonly yanked: boolean
	readonly sections: ReadonlyMap<ChangelogCategory, string>
}

export interface ChangelogDocument {
	readonly unreleased: ReadonlyMap<ChangelogCategory, string>
	readonly releases: readonly ChangelogRelease[]
}

export interface ChangelogRangeQuery {
	readonly currentVersion: string
	readonly targetVersion: string
	readonly channel: ChangelogChannel
}

export class ChangelogContractError extends Error {
	readonly line?: number

	constructor(message: string, line?: number) {
		super(
			line === undefined ? `CHANGELOG.md：${message}` : `CHANGELOG.md 第 ${line} 行：${message}`,
		)
		this.name = 'ChangelogContractError'
		this.line = line
	}
}

type ParsedVersion = {
	readonly major: bigint
	readonly minor: bigint
	readonly patch: bigint
	readonly beta: bigint | null
}

type SourceLine = {
	readonly number: number
	readonly text: string
	readonly structural: boolean
}

const SUPPORTED_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.([1-9]\d*))?$/
const RELEASE_HEADING = /^## \[([^\]]+)\] - (\S+)( \[已撤回\])?$/
const CATEGORY_HEADING = /^### (新增|变更|弃用|移除|修复|安全)$/
const COMPARISON_LINK_PREFIX = /^\[([^\]]+)\]:/
const COMPARISON_LINK = /^\[([^\]]+)\]:\s+(\S.*)$/

function fail(message: string, line?: number): never {
	throw new ChangelogContractError(message, line)
}

function parseVersion(value: string): ParsedVersion | null {
	const match = SUPPORTED_VERSION.exec(value)
	if (!match) return null
	return {
		major: BigInt(match[1]),
		minor: BigInt(match[2]),
		patch: BigInt(match[3]),
		beta: match[4] === undefined ? null : BigInt(match[4]),
	}
}

function compareParsedVersions(left: ParsedVersion, right: ParsedVersion) {
	for (const key of ['major', 'minor', 'patch'] as const) {
		if (left[key] > right[key]) return 1
		if (left[key] < right[key]) return -1
	}
	if (left.beta === null) return right.beta === null ? 0 : 1
	if (right.beta === null) return -1
	return left.beta > right.beta ? 1 : left.beta < right.beta ? -1 : 0
}

export function compareChangelogVersions(left: string, right: string) {
	const parsedLeft = parseVersion(left)
	const parsedRight = parseVersion(right)
	if (!parsedLeft) fail(`不受支持的版本：${left}`)
	if (!parsedRight) fail(`不受支持的版本：${right}`)
	return compareParsedVersions(parsedLeft, parsedRight)
}

function isValidIsoDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
	const date = new Date(`${value}T00:00:00.000Z`)
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function annotateLines(source: string): SourceLine[] {
	const normalized = (source.startsWith('\uFEFF') ? source.slice(1) : source).replace(
		/\r\n?/g,
		'\n',
	)
	let fence: { marker: '`' | '~'; length: number } | null = null

	return normalized.split('\n').map((text, index) => {
		const line = { number: index + 1, text, structural: fence === null }
		if (fence) {
			const closing = new RegExp(`^ {0,3}\\${fence.marker}{${fence.length},}[ \\t]*$`)
			if (closing.test(text)) fence = null
			return { ...line, structural: false }
		}

		const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text)
		if (!opening) return line
		const marker = opening[1][0] as '`' | '~'
		if (marker === '`' && opening[2].includes('`')) return line
		fence = { marker, length: opening[1].length }
		return { ...line, structural: false }
	})
}

function isLinkDefinition(line: SourceLine) {
	return line.structural && COMPARISON_LINK_PREFIX.test(line.text)
}

function comparisonLinkLabel(line: SourceLine) {
	if (!isLinkDefinition(line)) return null
	const match = COMPARISON_LINK_PREFIX.exec(line.text)
	if (!match) return null
	return match[1] === '未发布' || parseVersion(match[1]) ? match[1] : null
}

function trimBlankLineEdges(lines: string[]) {
	let start = 0
	let end = lines.length
	while (start < end && !lines[start].trim()) start += 1
	while (end > start && !lines[end - 1].trim()) end -= 1
	return lines.slice(start, end).join('\n')
}

function parseSections(
	lines: readonly SourceLine[],
	start: number,
	owner: string,
	allowEmpty: boolean,
) {
	const sections = new Map<ChangelogCategory, string>()
	let currentCategory: ChangelogCategory | null = null
	let bodyLines: string[] = []
	let index = start

	const commitSection = () => {
		if (!currentCategory) return
		const body = trimBlankLineEdges(bodyLines)
		if (!body.trim()) fail(`${owner} 的 ${currentCategory} 分类不能为空`, lines[index - 1]?.number)
		sections.set(currentCategory, body)
		bodyLines = []
	}

	while (index < lines.length) {
		const line = lines[index]
		if (line.structural && line.text.startsWith('## ')) break
		if (isLinkDefinition(line)) break

		if (line.structural && line.text.startsWith('### ')) {
			const match = CATEGORY_HEADING.exec(line.text)
			if (!match) fail(`${owner} 包含不受支持的分类标题`, line.number)
			commitSection()
			const category = match[1] as ChangelogCategory
			if (sections.has(category)) fail(`${owner} 包含重复分类 ${category}`, line.number)
			currentCategory = category
			index += 1
			continue
		}

		if (!currentCategory && line.text.trim()) {
			fail(`${owner} 的正文必须位于六个规范分类之下`, line.number)
		}
		if (currentCategory) bodyLines.push(line.text)
		index += 1
	}

	commitSection()
	if (!allowEmpty && sections.size === 0)
		fail(`${owner} 至少需要一个非空分类`, lines[start - 1]?.number)
	return { nextIndex: index, sections }
}

function parseFooter(lines: readonly SourceLine[], start: number) {
	const labels = new Set<string>()
	for (let index = start; index < lines.length; index += 1) {
		const line = lines[index]
		if (!line.text.trim()) continue
		const label = comparisonLinkLabel(line)
		const match = COMPARISON_LINK.exec(line.text)
		if (!label || !match || !match[2].trim())
			fail('比较链接只能位于文末且目标不能为空', line.number)
		if (labels.has(label)) fail(`比较链接 ${label} 重复`, line.number)
		labels.add(label)
	}
}

export function parseChangelogDocument(source: string): ChangelogDocument {
	const lines = annotateLines(source)
	const unreleasedIndex = lines.findIndex((line) => line.structural && line.text.startsWith('## '))
	if (unreleasedIndex < 0) fail('缺少唯一顶部 ## [未发布]')
	if (lines[unreleasedIndex].text !== '## [未发布]') {
		fail('第一个 H2 必须是唯一的 ## [未发布]', lines[unreleasedIndex].number)
	}
	for (let index = 0; index < unreleasedIndex; index += 1) {
		if (lines[index].structural && /^#{2,6}\s/.test(lines[index].text)) {
			fail('未发布前只允许 H1 和规范简介', lines[index].number)
		}
	}

	const unreleasedResult = parseSections(lines, unreleasedIndex + 1, '未发布', true)
	const releases: ChangelogRelease[] = []
	const seenVersions = new Set<string>()
	let index = unreleasedResult.nextIndex

	while (index < lines.length) {
		const line = lines[index]
		if (isLinkDefinition(line)) {
			parseFooter(lines, index)
			break
		}
		if (line.text === '## [未发布]') fail('未发布必须唯一', line.number)

		const heading = line.structural ? RELEASE_HEADING.exec(line.text) : null
		if (!heading || !parseVersion(heading[1])) fail('版本标题格式无效', line.number)
		const version = heading[1]
		const date = heading[2]
		if (!isValidIsoDate(date)) fail(`版本 ${version} 的日期无效`, line.number)
		if (seenVersions.has(version)) fail(`存在重复版本 ${version}`, line.number)
		const previous = releases.at(-1)
		if (previous && compareChangelogVersions(previous.version, version) <= 0) {
			fail('已发布版本必须按受支持的 SemVer 从新到旧排列', line.number)
		}
		seenVersions.add(version)

		const result = parseSections(lines, index + 1, `版本 ${version}`, false)
		releases.push({
			version,
			date,
			yanked: heading[3] !== undefined,
			sections: result.sections,
		})
		index = result.nextIndex
	}

	return { unreleased: unreleasedResult.sections, releases }
}

export function getPublishableRelease(document: ChangelogDocument, targetVersion: string) {
	if (!parseVersion(targetVersion)) fail(`发布目标版本无效：${targetVersion}`)
	const release = document.releases.find((item) => item.version === targetVersion)
	if (!release) fail(`发布目标版本 ${targetVersion} 不存在`)
	if (release.yanked) fail(`发布目标版本 ${targetVersion} 已撤回`)
	return release
}

export function selectChangelogRange(document: ChangelogDocument, query: ChangelogRangeQuery) {
	const current = parseVersion(query.currentVersion)
	const target = parseVersion(query.targetVersion)
	if (!current) fail(`当前版本无效：${query.currentVersion}`)
	if (!target) fail(`目标版本无效：${query.targetVersion}`)
	const targetChannel: ChangelogChannel = target.beta === null ? 'stable' : 'beta'
	if (targetChannel !== query.channel) fail('目标版本与 Changelog 渠道不一致')
	if (compareParsedVersions(current, target) >= 0) return []

	return document.releases.filter((release) => {
		if (release.yanked) return false
		const version = parseVersion(release.version)!
		if (query.channel === 'stable' && version.beta !== null) return false
		return (
			compareParsedVersions(version, current) > 0 && compareParsedVersions(version, target) <= 0
		)
	})
}

export function selectChangelogHistory(document: ChangelogDocument, channel: ChangelogChannel) {
	return document.releases.filter(
		(release) => channel === 'beta' || parseVersion(release.version)?.beta === null,
	)
}
