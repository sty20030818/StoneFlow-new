import { openUrl } from '@tauri-apps/plugin-opener'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
	createTaskLink,
	deleteTaskLink,
	listTaskLinks,
	updateTaskLink,
} from '@/features/task/api/taskLinks'
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
	const [links, setLinks] = useState<TaskLink[]>([])
	const [status, setStatus] = useState<LoadStatus>('idle')
	const [error, setError] = useState<string | null>(null)

	const reloadLinks = useCallback(async () => {
		setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
		setError(null)
		try {
			const nextLinks = await listTaskLinks({ taskId })
			setLinks(nextLinks)
			setStatus('ready')
		} catch (nextError) {
			setStatus('error')
			setError(nextError instanceof Error ? nextError.message : '链接加载失败')
		}
	}, [taskId])

	useEffect(() => {
		void reloadLinks()
	}, [reloadLinks])

	const runMutation = useCallback(
		async (runner: () => Promise<unknown>, failureMessage: string) => {
			try {
				await runner()
				await reloadLinks()
			} catch (nextError) {
				const message =
					nextError instanceof Error && nextError.message ? nextError.message : failureMessage
				toast.error(message)
				throw nextError
			}
		},
		[reloadLinks],
	)

	const addLink = useCallback(
		async (input: TaskLinkFormInput) => {
			const normalizedUrl = normalizeTaskLinkUrl(input.url)
			await runMutation(
				() =>
					createTaskLink({
						taskId,
						title: input.title,
						url: normalizedUrl,
					}),
				'新增链接失败',
			)
		},
		[runMutation, taskId],
	)

	const editLink = useCallback(
		async (linkId: string, input: TaskLinkFormInput) => {
			const normalizedUrl = normalizeTaskLinkUrl(input.url)
			await runMutation(
				() =>
					updateTaskLink({
						linkId,
						title: input.title,
						url: normalizedUrl,
					}),
				'更新链接失败',
			)
		},
		[runMutation],
	)

	const removeLink = useCallback(
		async (linkId: string) => {
			await runMutation(
				() =>
					deleteTaskLink({
						linkId,
					}),
				'删除链接失败',
			)
		},
		[runMutation],
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
		links,
		status,
		error,
		reloadLinks,
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
