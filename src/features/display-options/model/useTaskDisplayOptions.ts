import { useCallback, useMemo, useState } from 'react'

import {
	resolveTaskDisplayOptions,
	type ResolvedTaskDisplayOptions,
	type TaskDisplayCompletedOrder,
	type TaskDisplayGroupBy,
	type TaskDisplayOrderBy,
	type TaskDisplayOrderDirection,
	type TaskDisplayPageKey,
	type TaskDisplayPreferenceRecord,
	type TaskDisplayPropertyKey,
} from '@/features/display-options/core'

import { useTaskDisplayPreferenceQuery } from './taskDisplayOptions.queries'
import { useUpdateTaskDisplayPreferenceMutation } from './taskDisplayOptions.mutations'

export type UseTaskDisplayOptionsResult = {
	options: ResolvedTaskDisplayOptions
	status: 'loading' | 'ready' | 'error'
	error: string | null
	isDirty: boolean
	personalOverride: TaskDisplayPreferenceRecord
	actions: {
		applyPartial: (patch: TaskDisplayPreferenceRecord) => Promise<void>
		setGrouping: (groupBy: TaskDisplayGroupBy) => Promise<void>
		setSubGrouping: (subGroupBy: TaskDisplayGroupBy) => Promise<void>
		setOrdering: (
			orderBy: TaskDisplayOrderBy,
			orderDirection?: TaskDisplayOrderDirection,
		) => Promise<void>
		setCompletedOrder: (completedOrder: TaskDisplayCompletedOrder) => Promise<void>
		setVisibleProperties: (visibleProperties: TaskDisplayPropertyKey[]) => Promise<void>
		/** 当前 resolved 选项写入 workspace default，并清空 personal */
		setAsDefault: () => Promise<void>
		resetToDefault: () => Promise<void>
		reload: () => Promise<void>
	}
}

export function useTaskDisplayOptions(pageKey: TaskDisplayPageKey): UseTaskDisplayOptionsResult {
	const preferenceQuery = useTaskDisplayPreferenceQuery(pageKey)
	const updatePreference = useUpdateTaskDisplayPreferenceMutation()
	const [draftOverride, setDraftOverride] = useState<TaskDisplayPreferenceRecord | null>(null)

	const persistedPayload = preferenceQuery.data
	const persistedPersonal = persistedPayload?.personal ?? null

	const personalOverride = useMemo<TaskDisplayPreferenceRecord>(
		() => draftOverride ?? persistedPersonal ?? {},
		[draftOverride, persistedPersonal],
	)

	const options = useMemo(
		() =>
			resolveTaskDisplayOptions({
				pageKey,
				workspaceDefault: persistedPayload?.workspaceDefault ?? null,
				personalOverride,
			}),
		[pageKey, personalOverride, persistedPayload?.workspaceDefault],
	)

	const isDirty = useMemo(() => {
		return JSON.stringify(personalOverride) !== JSON.stringify(persistedPersonal ?? {})
	}, [personalOverride, persistedPersonal])

	const commitDraft = useCallback(
		async (nextPersonal: TaskDisplayPreferenceRecord | null) => {
			setDraftOverride(nextPersonal ?? {})
			try {
				await updatePreference.mutateAsync({
					pageKey,
					personal: nextPersonal,
					workspaceDefault: persistedPayload?.workspaceDefault ?? null,
				})
				setDraftOverride(null)
			} catch (error) {
				setDraftOverride(null)
				throw error
			}
		},
		[pageKey, persistedPayload?.workspaceDefault, updatePreference],
	)

	const applyPartial = useCallback(
		async (patch: TaskDisplayPreferenceRecord) => {
			const nextPersonal = {
				...(persistedPersonal ?? {}),
				...(draftOverride ?? {}),
				...patch,
			}
			await commitDraft(nextPersonal)
		},
		[commitDraft, draftOverride, persistedPersonal],
	)

	const setAsDefault = useCallback(async () => {
		// 把当前呈现结果固化为页面 default，并清空个人覆盖（对齐 Linear Set as default）
		const asDefault: TaskDisplayPreferenceRecord = {
			groupBy: options.groupBy,
			subGroupBy: options.subGroupBy,
			orderBy: options.orderBy,
			orderDirection: options.orderDirection,
			completedOrder: options.completedOrder,
			showEmptyGroups: options.showEmptyGroups,
			visibleProperties: [...options.visibleProperties],
		}
		setDraftOverride({})
		try {
			await updatePreference.mutateAsync({
				pageKey,
				personal: null,
				workspaceDefault: asDefault,
			})
			setDraftOverride(null)
		} catch (error) {
			setDraftOverride(null)
			throw error
		}
	}, [options, pageKey, updatePreference])

	return {
		options,
		status: preferenceQuery.isError
			? 'error'
			: preferenceQuery.isLoading || preferenceQuery.isPending
				? 'loading'
				: 'ready',
		error: preferenceQuery.error instanceof Error ? preferenceQuery.error.message : null,
		isDirty,
		personalOverride,
		actions: {
			applyPartial,
			setGrouping: (groupBy) => applyPartial({ groupBy }),
			setSubGrouping: (subGroupBy) => applyPartial({ subGroupBy }),
			setOrdering: (orderBy, orderDirection) => applyPartial({ orderBy, orderDirection }),
			setCompletedOrder: (completedOrder) => applyPartial({ completedOrder }),
			setVisibleProperties: (visibleProperties) => applyPartial({ visibleProperties }),
			setAsDefault,
			resetToDefault: () => commitDraft(null),
			reload: async () => {
				setDraftOverride(null)
				await preferenceQuery.refetch()
			},
		},
	}
}
