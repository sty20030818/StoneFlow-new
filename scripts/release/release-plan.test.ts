import { describe, expect, test } from 'bun:test'

import { resolveReleasePlan } from './release-plan'
import {
	LEGACY_RELEASE_TAG_SCHEMA,
	RELEASE_TAG_SCHEMA,
	type ReleaseChannel,
	type ReleaseLedgerSnapshot,
	type ReleasePlanInput,
	type ReleaseTagSnapshot,
} from './types'

const COMMIT_A = 'a'.repeat(40)
const COMMIT_B = 'b'.repeat(40)
const COMMIT_C = 'c'.repeat(40)
const STABLE_BASELINE_TAG = tag('v0.1.1', COMMIT_A)

function tag(
	name: string,
	commit = COMMIT_A,
	schema: string | null = RELEASE_TAG_SCHEMA,
): ReleaseTagSnapshot {
	return { name, commit, schema }
}

function ledger(channel: ReleaseChannel, commit: string | null): ReleaseLedgerSnapshot {
	return { channel, commit }
}

function plan(overrides: Partial<ReleasePlanInput> = {}) {
	return resolveReleasePlan({
		channel: 'beta',
		sourceVersion: '0.1.1',
		commit: COMMIT_C,
		tags: [STABLE_BASELINE_TAG],
		ledger: ledger('beta', COMMIT_A),
		...overrides,
	})
}

describe('resolveReleasePlan', () => {
	test('Stable 新版本使用配置版本并以渠道 ledger 为 claim 前置', () => {
		expect(
			plan({
				channel: 'stable',
				sourceVersion: '0.1.3',
				tags: [tag('v0.1.2', COMMIT_A)],
				ledger: ledger('stable', COMMIT_A),
			}),
		).toEqual({
			kind: 'claim',
			version: '0.1.3',
			tagName: 'v0.1.3',
			commit: COMMIT_C,
			expectedLedgerCommit: COMMIT_A,
		})
	})

	test('Stable 新版本必须高于远端最新 Stable Tag', () => {
		expect(() =>
			plan({
				channel: 'stable',
				sourceVersion: '0.1.1',
				tags: [tag('v0.1.2', COMMIT_A)],
				ledger: ledger('stable', COMMIT_A),
			}),
		).toThrow('必须高于')
	})

	test('Stable 同 commit 已有 schema 1 Tag 时复用配置版本', () => {
		expect(
			plan({
				channel: 'stable',
				sourceVersion: '0.1.2',
				commit: COMMIT_A,
				tags: [tag('v0.1.2', COMMIT_A)],
				ledger: ledger('stable', COMMIT_A),
			}),
		).toEqual({
			kind: 'reuse',
			version: '0.1.2',
			tagName: 'v0.1.2',
			commit: COMMIT_A,
			expectedLedgerCommit: COMMIT_A,
		})
	})

	test('空 Beta 序列从配置版本的 next patch beta.1 开始', () => {
		expect(plan()).toEqual({
			kind: 'claim',
			version: '0.1.2-beta.1',
			tagName: 'v0.1.2-beta.1',
			commit: COMMIT_C,
			expectedLedgerCommit: COMMIT_A,
		})
	})

	test('Beta 在同一 base 上按远端最大 beta.N 递增', () => {
		expect(
			plan({
				tags: [STABLE_BASELINE_TAG, tag('v0.1.2-beta.3', COMMIT_B), tag('v0.1.2-beta.1', COMMIT_A)],
				ledger: ledger('beta', COMMIT_B),
			}),
		).toEqual({
			kind: 'claim',
			version: '0.1.2-beta.4',
			tagName: 'v0.1.2-beta.4',
			commit: COMMIT_C,
			expectedLedgerCommit: COMMIT_B,
		})
	})

	test('同渠道同 commit 已有 Tag 时复用原版本，即使 ledger 已推进到后继版本', () => {
		expect(
			plan({
				commit: COMMIT_A,
				tags: [
					STABLE_BASELINE_TAG,
					tag('v0.1.2', COMMIT_C),
					tag('v0.1.2-beta.3', COMMIT_A),
					tag('v0.1.2-beta.4', COMMIT_B),
				],
				ledger: ledger('beta', COMMIT_B),
			}),
		).toEqual({
			kind: 'reuse',
			version: '0.1.2-beta.3',
			tagName: 'v0.1.2-beta.3',
			commit: COMMIT_A,
			expectedLedgerCommit: COMMIT_B,
		})
	})

	test('不同渠道允许同一 commit 各自绑定一个版本', () => {
		expect(
			plan({
				commit: COMMIT_A,
				tags: [tag('v0.1.1', COMMIT_A, LEGACY_RELEASE_TAG_SCHEMA)],
			}),
		).toMatchObject({ kind: 'claim', version: '0.1.2-beta.1' })
	})

	test('拒绝同渠道同一 commit 绑定多个版本', () => {
		expect(() =>
			plan({
				commit: COMMIT_A,
				tags: [STABLE_BASELINE_TAG, tag('v0.1.2-beta.2', COMMIT_A), tag('v0.1.2-beta.3', COMMIT_A)],
				ledger: ledger('beta', COMMIT_A),
			}),
		).toThrow('同渠道同一 commit')
	})

	test('拒绝同一版本绑定多个 commit', () => {
		expect(() =>
			plan({
				tags: [STABLE_BASELINE_TAG, tag('v0.1.2-beta.1', COMMIT_A), tag('v0.1.2-beta.1', COMMIT_B)],
				ledger: ledger('beta', COMMIT_B),
			}),
		).toThrow('同一版本')
	})

	test('拒绝候选版本已经绑定其他 commit', () => {
		expect(() =>
			plan({
				channel: 'stable',
				sourceVersion: '0.1.3',
				tags: [tag('v0.1.3', COMMIT_A)],
				ledger: ledger('stable', COMMIT_A),
			}),
		).toThrow('已绑定到 commit')
	})

	test.each([null, '2'])('规划前全量拒绝缺失或未知 schema marker：%s', (schema) => {
		expect(() =>
			plan({
				tags: [tag('v0.1.1', COMMIT_A, schema)],
			}),
		).toThrow('schema marker')
	})

	test('Stable legacy seed 参与版本排序', () => {
		expect(
			plan({
				channel: 'stable',
				sourceVersion: '0.1.4',
				tags: [tag('v0.1.3', COMMIT_B, LEGACY_RELEASE_TAG_SCHEMA), tag('v0.1.2', COMMIT_A)],
				ledger: ledger('stable', COMMIT_B),
			}),
		).toMatchObject({ kind: 'claim', version: '0.1.4' })
	})

	test('Stable legacy seed 不允许作为补发版本复用', () => {
		expect(() =>
			plan({
				channel: 'stable',
				sourceVersion: '0.1.1',
				commit: COMMIT_A,
				tags: [tag('v0.1.1', COMMIT_A, LEGACY_RELEASE_TAG_SCHEMA)],
				ledger: ledger('stable', COMMIT_A),
			}),
		).toThrow('legacy seed')
	})

	test('拒绝伪造的 Beta legacy seed', () => {
		expect(() =>
			plan({
				tags: [STABLE_BASELINE_TAG, tag('v0.1.2-beta.1', COMMIT_A, LEGACY_RELEASE_TAG_SCHEMA)],
				ledger: ledger('beta', COMMIT_A),
			}),
		).toThrow('Beta Tag 不允许使用 legacy seed')
	})

	test('配置基线落后于远端 Beta base 时拒绝继续发号', () => {
		expect(() =>
			plan({
				tags: [STABLE_BASELINE_TAG, tag('v0.1.3-beta.1', COMMIT_A)],
				ledger: ledger('beta', COMMIT_A),
			}),
		).toThrow('配置基线落后')
	})

	test('Beta 配置基线落后于远端 Stable Tag 时拒绝继续发号', () => {
		expect(() =>
			plan({
				tags: [STABLE_BASELINE_TAG, tag('v0.1.2', COMMIT_B)],
			}),
		).toThrow('配置基线落后')
	})

	test('已有渠道 Tag 时要求 ledger frontier 等于最新 Tag commit', () => {
		expect(() =>
			plan({
				tags: [STABLE_BASELINE_TAG, tag('v0.1.2-beta.1', COMMIT_A)],
				ledger: ledger('beta', COMMIT_B),
			}),
		).toThrow('ledger frontier')
	})

	test('首个 Beta 要求 ledger 位于对应 Stable 基线', () => {
		expect(() => plan({ ledger: ledger('beta', null) })).toThrow('Stable 基线')
	})

	test('Beta 要求存在与配置版本精确对应的 Stable Tag', () => {
		expect(() =>
			plan({
				tags: [tag('v0.1.0', COMMIT_A)],
				ledger: ledger('beta', COMMIT_A),
			}),
		).toThrow('Stable 基线 Tag')
	})

	test('ledger 渠道必须与规划渠道一致', () => {
		expect(() => plan({ ledger: ledger('stable', COMMIT_A) })).toThrow('ledger 渠道')
	})

	test.each(['v01.1.1', 'v0.1.2-beta.0', 'v0.1.2-alpha.1', 'v0.1.2+build.1'])(
		'拒绝不受支持的远端 v* Tag：%s',
		(name) => {
			expect(() => plan({ tags: [STABLE_BASELINE_TAG, tag(name, COMMIT_B)] })).toThrow('远端 Tag')
		},
	)

	test('commit、Tag commit 与 ledger commit 必须是完整 SHA', () => {
		expect(() => plan({ commit: 'abc' })).toThrow('40 位 commit SHA')
		expect(() => plan({ tags: [tag('v0.1.1', 'abc')] })).toThrow('40 位 commit SHA')
		expect(() => plan({ ledger: ledger('beta', 'abc') })).toThrow('40 位 commit SHA')
	})

	test('既有 Beta Tag 必须匹配当前配置基线', () => {
		expect(() =>
			plan({
				commit: COMMIT_A,
				tags: [STABLE_BASELINE_TAG, tag('v0.1.3-beta.1', COMMIT_A)],
				ledger: ledger('beta', COMMIT_A),
			}),
		).toThrow('配置基线不一致')
	})

	test('使用 BigInt 递增超出 Number 安全范围的版本与 beta.N', () => {
		const largeCommit = 'd'.repeat(40)
		expect(
			plan({
				sourceVersion: '9007199254740993.0.9007199254740993',
				tags: [
					tag('v9007199254740993.0.9007199254740993', COMMIT_A),
					tag('v9007199254740993.0.9007199254740994-beta.9007199254740993', largeCommit),
				],
				ledger: ledger('beta', largeCommit),
			}),
		).toMatchObject({
			version: '9007199254740993.0.9007199254740994-beta.9007199254740994',
		})
	})

	test('配置版本必须是无前导零的 Stable SemVer', () => {
		expect(() => plan({ sourceVersion: '01.1.1' })).toThrow('Stable SemVer')
	})
})
