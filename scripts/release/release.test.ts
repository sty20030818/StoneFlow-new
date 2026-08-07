import { describe, expect, test } from 'bun:test'

import { parseReleaseArguments, runReleaseWorkflow } from './release'
import type { ReleasePlan } from './types'

const claimPlan: ReleasePlan = {
	kind: 'claim',
	version: '0.1.4-beta.4',
	tagName: 'v0.1.4-beta.4',
	commit: 'a'.repeat(40),
	expectedLedgerCommit: 'b'.repeat(40),
}

const reusePlan: ReleasePlan = { ...claimPlan, kind: 'reuse' }

type Phase =
	| 'inspect'
	| 'build'
	| 'revalidate'
	| 'inspect-changelog'
	| 'claim'
	| 'record'
	| 'changelog'
	| 'validate-changelog'
	| 'pointer'

function createHarness(
	input: {
		plan?: ReleasePlan
		existingRecord?: boolean
		failAt?: Phase
	} = {},
) {
	const events: Phase[] = []
	const prepared = { source: input.existingRecord ? 'remote' : 'build' }
	const observed: {
		claimedPlan?: ReleasePlan
		changelogPlan?: ReleasePlan
		recordInput?: typeof prepared
		pointerInput?: typeof prepared
	} = {}

	function enter(phase: Phase) {
		events.push(phase)
		if (input.failAt === phase) throw new Error(`boom:${phase}`)
	}

	return {
		events,
		observed,
		prepared,
		steps: {
			inspectPlatformRecord: async () => {
				enter('inspect')
				return input.existingRecord ? prepared : null
			},
			buildAndCollect: async () => {
				enter('build')
				return prepared
			},
			revalidate: async () => {
				enter('revalidate')
				return input.plan ?? claimPlan
			},
			inspectChangelogCompatibility: async () => {
				enter('inspect-changelog')
			},
			claim: async (plan: ReleasePlan) => {
				enter('claim')
				observed.claimedPlan = plan
			},
			publishArtifactsAndRecord: async (release: typeof prepared) => {
				enter('record')
				observed.recordInput = release
			},
			publishChangelog: async (plan: ReleasePlan) => {
				enter('changelog')
				observed.changelogPlan = plan
			},
			validatePublishedChangelog: async () => {
				enter('validate-changelog')
			},
			advancePlatformPointer: async (release: typeof prepared) => {
				enter('pointer')
				observed.pointerInput = release
			},
		},
	}
}

describe('runReleaseWorkflow', () => {
	test('既有 platform record 一致时跳过构建和 record 写入', async () => {
		const harness = createHarness({ plan: reusePlan, existingRecord: true })

		await runReleaseWorkflow({ noUpload: false, plan: reusePlan }, harness.steps)

		expect(harness.events).toEqual([
			'inspect',
			'revalidate',
			'inspect-changelog',
			'claim',
			'changelog',
			'validate-changelog',
			'pointer',
		])
		expect(harness.observed.pointerInput).toBe(harness.prepared)
	})

	test('platform record 不存在时构建并收集，再提交不可变 record', async () => {
		const harness = createHarness()

		await runReleaseWorkflow({ noUpload: false, plan: claimPlan }, harness.steps)

		expect(harness.events).toEqual([
			'inspect',
			'build',
			'revalidate',
			'inspect-changelog',
			'claim',
			'record',
			'changelog',
			'validate-changelog',
			'pointer',
		])
		expect(harness.observed.recordInput).toBe(harness.prepared)
		expect(harness.observed.pointerInput).toBe(harness.prepared)
	})

	test('claim 使用构建后 revalidate 返回的计划，Pointer 始终最后推进', async () => {
		const revalidatedPlan = { ...claimPlan }
		const harness = createHarness({ plan: revalidatedPlan })

		await runReleaseWorkflow({ noUpload: false, plan: claimPlan }, harness.steps)

		expect(harness.observed.claimedPlan).toBe(revalidatedPlan)
		expect(harness.observed.changelogPlan).toBe(revalidatedPlan)
		expect(harness.events.indexOf('inspect-changelog')).toBeLessThan(
			harness.events.indexOf('claim'),
		)
		expect(harness.events.indexOf('revalidate')).toBeLessThan(harness.events.indexOf('claim'))
		expect(harness.events.at(-1)).toBe('pointer')
	})

	test.each([
		'inspect',
		'build',
		'revalidate',
		'inspect-changelog',
		'claim',
		'record',
		'changelog',
		'validate-changelog',
	] as const)('%s 失败时不推进 Pointer', async (failAt) => {
		const harness = createHarness({ failAt })

		await expect(
			runReleaseWorkflow({ noUpload: false, plan: claimPlan }, harness.steps),
		).rejects.toThrow(`boom:${failAt}`)
		expect(harness.events).not.toContain('pointer')
		if (failAt === 'inspect-changelog') expect(harness.observed.claimedPlan).toBeUndefined()
	})

	test('--no-upload 只做本地构建收集，不读取 R2、不写 Git/R2', async () => {
		const harness = createHarness()

		await runReleaseWorkflow({ noUpload: true, plan: claimPlan }, harness.steps)

		expect(harness.events).toEqual(['build'])
	})

	test('既有 Tag 但 record 缺失时按 reuse 计划恢复剩余全部阶段', async () => {
		const harness = createHarness({ plan: reusePlan })

		await runReleaseWorkflow({ noUpload: false, plan: reusePlan }, harness.steps)

		expect(harness.events).toEqual([
			'inspect',
			'build',
			'revalidate',
			'inspect-changelog',
			'claim',
			'record',
			'changelog',
			'validate-changelog',
			'pointer',
		])
		expect(harness.observed.claimedPlan?.kind).toBe('reuse')
		expect(harness.observed.changelogPlan?.kind).toBe('reuse')
	})

	test('尚未建立 Tag 时拒绝复用孤立的远端 record', async () => {
		const harness = createHarness({ existingRecord: true })

		await expect(
			runReleaseWorkflow({ noUpload: false, plan: claimPlan }, harness.steps),
		).rejects.toThrow('尚未建立发布 Tag')
		expect(harness.events).toEqual(['inspect'])
	})
})

describe('parseReleaseArguments', () => {
	test('无参数发布，可选 --no-upload', () => {
		expect(parseReleaseArguments([])).toEqual({ noUpload: false })
		expect(parseReleaseArguments(['--no-upload'])).toEqual({ noUpload: true })
	})

	test('拒绝渠道、版本和重复参数', () => {
		expect(() => parseReleaseArguments(['beta'])).toThrow('未知发布参数：beta')
		expect(() => parseReleaseArguments(['--version', '0.1.4-beta.4'])).toThrow(
			'未知发布参数：--version',
		)
		expect(() => parseReleaseArguments(['--no-upload', '--no-upload'])).toThrow(
			'--no-upload 不得重复',
		)
	})
})
