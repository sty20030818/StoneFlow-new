import { useCallback, useRef, useState } from 'react'

// ----- 类型 -----
export type CommandMode = 'idle' | 'search' | 'create'
export type CommandPriority = 'P0' | 'P1' | 'P2' | 'P3'
export type CommandStatus = 'idle' | 'submitting' | 'success' | 'error'

// ----- 常量 -----
export const PRIORITIES: CommandPriority[] = ['P0', 'P1', 'P2', 'P3']
export const PRIORITY_TO_PAYLOAD: Record<CommandPriority, string> = {
	P0: 'urgent',
	P1: 'high',
	P2: 'medium',
	P3: 'low',
}
export const PRIORITY_CLASS: Record<CommandPriority, string> = {
	P0: 'border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text)',
	P1: 'border-(--sf-color-warning-soft-border) bg-(--sf-color-warning-soft) text-(--sf-color-warning-soft-text)',
	P2: 'border-(--sf-color-accent-soft-border) bg-accent text-accent-foreground',
	P3: 'border-(--sf-color-border-subtle) bg-muted text-(--sf-color-text-secondary)',
}

// ----- Hook -----
export function useQuickCaptureState() {
	const inputRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const [query, setQuery] = useState('')
	const [priority, setPriority] = useState<CommandPriority>('P1')
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [status, setStatus] = useState<CommandStatus>('idle')
	const [message, setMessage] = useState('输入标题创建，或搜索已有任务与项目')

	const focusInput = useCallback(() => {
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				inputRef.current?.focus()
				inputRef.current?.select()
			})
		})
	}, [])

	const resetPanel = useCallback(() => {
		setQuery('')
		setPriority('P1')
		setHighlightedIndex(0)
		setIsLoading(false)
		setStatus('idle')
		setMessage('输入标题创建，或搜索已有任务与项目')
		focusInput()
	}, [focusInput])

	const cyclePriority = useCallback(() => {
		setPriority((current) => {
			const currentIndex = PRIORITIES.indexOf(current)
			return PRIORITIES[(currentIndex + 1) % PRIORITIES.length]
		})
	}, [])

	return {
		inputRef,
		closeTimerRef,
		query,
		setQuery,
		priority,
		setPriority,
		highlightedIndex,
		setHighlightedIndex,
		isLoading,
		setIsLoading,
		status,
		setStatus,
		message,
		setMessage,
		focusInput,
		resetPanel,
		cyclePriority,
	}
}
