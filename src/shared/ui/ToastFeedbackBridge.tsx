'use client'

import { useEffect, useRef } from 'react'

import { toast } from 'sonner'

type ToastFeedbackBridgeProps = {
	feedback: string | null
}

export function ToastFeedbackBridge({ feedback }: ToastFeedbackBridgeProps) {
	const lastFeedbackRef = useRef<string | null>(null)

	useEffect(() => {
		if (!feedback) {
			lastFeedbackRef.current = null
			return
		}

		if (lastFeedbackRef.current === feedback) {
			return
		}

		lastFeedbackRef.current = feedback
		toast.success(feedback)
	}, [feedback])

	return feedback ? (
		<p className='sr-only' role='status'>
			{feedback}
		</p>
	) : null
}
