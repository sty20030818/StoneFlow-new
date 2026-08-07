import {
	LEGACY_RELEASE_TAG_SCHEMA,
	RELEASE_TAG_SCHEMA,
	type ReleaseChannel,
	type ReleasePlan,
	type ReleasePlanInput,
	type ReleaseTagSnapshot,
} from './types'

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const RELEASE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.([1-9]\d*))?$/

interface ParsedVersion {
	readonly version: string
	readonly major: bigint
	readonly minor: bigint
	readonly patch: bigint
	readonly beta: bigint | null
}

interface ParsedTag extends ReleaseTagSnapshot {
	readonly version: string
	readonly channel: ReleaseChannel
	readonly parsedVersion: ParsedVersion
}

function assertCommitSha(commit: string, owner: string) {
	if (!COMMIT_SHA_PATTERN.test(commit)) {
		throw new Error(`${owner} 必须是完整 40 位 commit SHA，当前是 ${commit || '(空)'}`)
	}
}

function parseReleaseVersion(version: string, owner: string): ParsedVersion {
	const match = RELEASE_VERSION_PATTERN.exec(version)
	if (!match) {
		throw new Error(`${owner} 必须是无前导零的 Stable SemVer 或 beta.N，当前是 ${version}`)
	}

	return {
		version,
		major: BigInt(match[1]),
		minor: BigInt(match[2]),
		patch: BigInt(match[3]),
		beta: match[4] ? BigInt(match[4]) : null,
	}
}

function compareCore(left: ParsedVersion, right: ParsedVersion) {
	for (const [leftPart, rightPart] of [
		[left.major, right.major],
		[left.minor, right.minor],
		[left.patch, right.patch],
	] as const) {
		if (leftPart < rightPart) return -1
		if (leftPart > rightPart) return 1
	}
	return 0
}

function compareVersions(left: ParsedVersion, right: ParsedVersion) {
	const coreOrder = compareCore(left, right)
	if (coreOrder !== 0) return coreOrder
	if (left.beta === null) return right.beta === null ? 0 : 1
	if (right.beta === null) return -1
	return left.beta < right.beta ? -1 : left.beta > right.beta ? 1 : 0
}

function formatCore(version: ParsedVersion) {
	return `${version.major}.${version.minor}.${version.patch}`
}

function parseRemoteTag(tag: ReleaseTagSnapshot): ParsedTag {
	if (tag.schema !== RELEASE_TAG_SCHEMA && tag.schema !== LEGACY_RELEASE_TAG_SCHEMA) {
		throw new Error(`远端 Tag ${tag.name} 缺失或包含未知 schema marker：${tag.schema ?? '(缺失)'}`)
	}
	assertCommitSha(tag.commit, `远端 Tag ${tag.name} 的 commit`)

	if (!tag.name.startsWith('v')) {
		throw new Error(`远端 Tag ${tag.name} 必须以 v 开头`)
	}
	const version = tag.name.slice(1)
	const parsedVersion = parseReleaseVersion(version, `远端 Tag ${tag.name}`)
	const channel = parsedVersion.beta === null ? 'stable' : 'beta'
	if (channel === 'beta' && tag.schema === LEGACY_RELEASE_TAG_SCHEMA) {
		throw new Error(`Beta Tag 不允许使用 legacy seed：${tag.name}`)
	}

	return { ...tag, version, channel, parsedVersion }
}

function latestTag(tags: readonly ParsedTag[]) {
	return tags.reduce<ParsedTag | null>(
		(latest, tag) =>
			latest === null || compareVersions(tag.parsedVersion, latest.parsedVersion) > 0
				? tag
				: latest,
		null,
	)
}

function buildPlan(
	kind: ReleasePlan['kind'],
	version: string,
	input: ReleasePlanInput,
): ReleasePlan {
	return {
		kind,
		version,
		tagName: `v${version}`,
		commit: input.commit,
		expectedLedgerCommit: input.ledger.commit,
	}
}

export function resolveReleasePlan(input: ReleasePlanInput): ReleasePlan {
	const sourceVersion = parseReleaseVersion(input.sourceVersion, '配置版本')
	if (sourceVersion.beta !== null) {
		throw new Error(`配置版本必须是 Stable SemVer，当前是 ${input.sourceVersion}`)
	}
	assertCommitSha(input.commit, '待发布 commit')
	if (input.ledger.channel !== input.channel) {
		throw new Error(`ledger 渠道 ${input.ledger.channel} 与规划渠道 ${input.channel} 不一致`)
	}
	if (input.ledger.commit !== null) {
		assertCommitSha(input.ledger.commit, `${input.channel} ledger commit`)
	}

	const tags = input.tags.map(parseRemoteTag)
	const versionOwners = new Map<string, string>()
	const channelCommitVersions = new Map<string, string>()
	for (const tag of tags) {
		const versionOwner = versionOwners.get(tag.version)
		if (versionOwner !== undefined) {
			if (versionOwner !== tag.commit) {
				throw new Error(`同一版本 ${tag.version} 绑定了多个 commit：${versionOwner}、${tag.commit}`)
			}
			throw new Error(`远端快照包含重复 Tag ${tag.name}`)
		}
		versionOwners.set(tag.version, tag.commit)

		const channelCommitKey = `${tag.channel}:${tag.commit}`
		const boundVersion = channelCommitVersions.get(channelCommitKey)
		if (boundVersion !== undefined && boundVersion !== tag.version) {
			throw new Error(
				`同渠道同一 commit ${tag.commit} 绑定了多个版本：${boundVersion}、${tag.version}`,
			)
		}
		channelCommitVersions.set(channelCommitKey, tag.version)
	}

	const targetTags = tags.filter((tag) => tag.channel === input.channel)
	const latestTargetTag = latestTag(targetTags)
	if (latestTargetTag !== null && input.ledger.commit !== latestTargetTag.commit) {
		throw new Error(
			`${input.channel} ledger frontier ${input.ledger.commit ?? '(缺失)'} 与最新 Tag ${latestTargetTag.name} 的 commit ${latestTargetTag.commit} 不一致`,
		)
	}
	if (input.channel === 'stable' && latestTargetTag === null && input.ledger.commit !== null) {
		throw new Error('Stable ledger 已存在，但远端没有对应 Stable Tag')
	}

	const currentTag = targetTags.find((tag) => tag.commit === input.commit)
	if (currentTag?.schema === LEGACY_RELEASE_TAG_SCHEMA) {
		throw new Error(`legacy seed ${currentTag.name} 只用于排序和 ancestry，不能补发平台`)
	}

	if (input.channel === 'stable') {
		if (currentTag !== undefined) {
			if (currentTag.version !== input.sourceVersion) {
				throw new Error(
					`当前 commit 的 Stable Tag ${currentTag.name} 与配置版本 ${input.sourceVersion} 不一致`,
				)
			}
			return buildPlan('reuse', currentTag.version, input)
		}

		const existingOwner = versionOwners.get(input.sourceVersion)
		if (existingOwner !== undefined) {
			throw new Error(
				`版本 ${input.sourceVersion} 已绑定到 commit ${existingOwner}，当前 commit 是 ${input.commit}`,
			)
		}
		if (
			latestTargetTag !== null &&
			compareVersions(sourceVersion, latestTargetTag.parsedVersion) <= 0
		) {
			throw new Error(
				`Stable 配置版本 ${input.sourceVersion} 必须高于远端最新版本 ${latestTargetTag.version}`,
			)
		}
		return buildPlan('claim', input.sourceVersion, input)
	}

	const stableTags = tags.filter((tag) => tag.channel === 'stable')
	const stableBaseline = stableTags.find((tag) => tag.version === input.sourceVersion)
	if (stableBaseline === undefined) {
		throw new Error(`Beta 发布缺少配置版本 v${input.sourceVersion} 对应的 Stable 基线 Tag`)
	}

	const betaBase = {
		...sourceVersion,
		version: '',
		patch: sourceVersion.patch + 1n,
	}
	const betaBaseVersion = formatCore(betaBase)
	if (currentTag !== undefined) {
		if (compareCore(currentTag.parsedVersion, betaBase) !== 0) {
			throw new Error(
				`已有 Beta Tag 配置基线不一致：${currentTag.name}，当前配置 ${input.sourceVersion}`,
			)
		}
		return buildPlan('reuse', currentTag.version, input)
	}

	const latestStableTag = latestTag(stableTags)
	if (
		latestStableTag !== null &&
		compareVersions(sourceVersion, latestStableTag.parsedVersion) < 0
	) {
		throw new Error(
			`配置基线落后于远端 Stable Tag ${latestStableTag.name}，当前是 v${input.sourceVersion}`,
		)
	}
	if (latestTargetTag === null && input.ledger.commit !== stableBaseline.commit) {
		throw new Error(
			`首个 Beta 的 ledger 必须位于 Stable 基线 ${stableBaseline.name} 的 commit ${stableBaseline.commit}`,
		)
	}

	let latestBetaNumber = 0n
	for (const tag of targetTags) {
		const baseOrder = compareCore(tag.parsedVersion, betaBase)
		if (baseOrder > 0) {
			throw new Error(
				`配置基线落后于远端 Beta base ${formatCore(tag.parsedVersion)}，当前目标 base 是 ${betaBaseVersion}`,
			)
		}
		if (baseOrder === 0 && tag.parsedVersion.beta! > latestBetaNumber) {
			latestBetaNumber = tag.parsedVersion.beta!
		}
	}

	const version = `${betaBaseVersion}-beta.${latestBetaNumber + 1n}`
	const existingOwner = versionOwners.get(version)
	if (existingOwner !== undefined) {
		throw new Error(
			`版本 ${version} 已绑定到 commit ${existingOwner}，当前 commit 是 ${input.commit}`,
		)
	}
	return buildPlan('claim', version, input)
}
