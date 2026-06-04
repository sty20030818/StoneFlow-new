import { openUrl } from '@tauri-apps/plugin-opener'
import { useCallback } from 'react'
import { toast } from 'sonner'

import {
	useCreateTaskLinkMutation,
	useDeleteTaskLinkMutation,
	useTaskLinksQuery,
	useUpdateTaskLinkMutation,
} from '@/features/task/query'
import type { TaskLink } from '@/shared/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type TaskLinkFormInput = {
	title: string
	url: string
}

type UseTaskLinksControllerResult = {
	links: TaskLink[]
	status: LoadStatus
	error: string | null
	reloadLinks: () => Promise<void>
	addLink: (input: TaskLinkFormInput) => Promise<void>
	editLink: (linkId: string, input: TaskLinkFormInput) => Promise<void>
	removeLink: (linkId: string) => Promise<void>
	openLink: (link: TaskLink) => Promise<void>
}

export function useTaskLinksController(taskId: string): UseTaskLinksControllerResult {
	const linksQuery = useTaskLinksQuery(taskId)
	const createLink = useCreateTaskLinkMutation(taskId)
	const updateLink = useUpdateTaskLinkMutation(taskId)
	const deleteLink = useDeleteTaskLinkMutation(taskId)

	const runMutation = useCallback(
		async (runner: () => Promise<unknown>, failureMessage: string) => {
			try {
				await runner()
				await linksQuery.refetch()
			} catch (nextError) {
				const message =
					nextError instanceof Error && nextError.message ? nextError.message : failureMessage
				toast.error(message)
				throw nextError
			}
		},
		[linksQuery],
	)

	const addLink = useCallback(
		async (input: TaskLinkFormInput) => {
			const normalizedUrl = normalizeTaskLinkUrl(input.url)
			await runMutation(
				() =>
					createLink.mutateAsync({
						taskId,
						title: input.title,
						url: normalizedUrl,
					}),
				'新增链接失败',
			)
		},
		[createLink, runMutation, taskId],
	)

	const editLink = useCallback(
		async (linkId: string, input: TaskLinkFormInput) => {
			const normalizedUrl = normalizeTaskLinkUrl(input.url)
			await runMutation(
				() =>
					updateLink.mutateAsync({
						linkId,
						title: input.title,
						url: normalizedUrl,
					}),
				'更新链接失败',
			)
		},
		[runMutation, updateLink],
	)

	const removeLink = useCallback(
		async (linkId: string) => {
			await runMutation(
				() =>
					deleteLink.mutateAsync({
						linkId,
					}),
				'删除链接失败',
			)
		},
		[deleteLink, runMutation],
	)

	const handleOpenLink = useCallback(async (link: TaskLink) => {
		const normalizedUrl = normalizeTaskLinkUrl(link.url)
		try {
			await openUrl(normalizedUrl)
		} catch (nextError) {
			if (typeof window !== 'undefined') {
				window.open(normalizedUrl, '_blank', 'noopener,noreferrer')
			}
			toast.error(nextError instanceof Error ? nextError.message : '打开链接失败，已尝试浏览器回退')
		}
	}, [])

	return {
		links: linksQuery.data ?? [],
		status: linksQuery.isError
			? 'error'
			: linksQuery.isLoading || linksQuery.isPending
				? 'loading'
				: 'ready',
		error: linksQuery.error instanceof Error ? linksQuery.error.message : null,
		reloadLinks: async () => {
			await linksQuery.refetch()
		},
		addLink,
		editLink,
		removeLink,
		openLink: handleOpenLink,
	}
}

function normalizeTaskLinkUrl(value: string) {
	const trimmedValue = value.trim()
	if (!trimmedValue) {
		return trimmedValue
	}

	if (/^https?:\/\//i.test(trimmedValue)) {
		return trimmedValue
	}

	return `https://${trimmedValue}`
}
