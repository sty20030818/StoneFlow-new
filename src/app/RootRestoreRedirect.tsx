import { startTransition, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { resolveStartupPath } from '@/app/layouts/shell/model/shellDevicePreferences'
import {
	selectSpaceError,
	selectSpaces,
	selectSpaceStatus,
	useSpaceStore,
} from '@/features/space/model/useSpaceStore'

export function RootRestoreRedirect() {
	const navigate = useNavigate()
	const spaces = useSpaceStore(selectSpaces)
	const spaceStatus = useSpaceStore(selectSpaceStatus)
	const spaceError = useSpaceStore(selectSpaceError)
	const loadSpaces = useSpaceStore((state) => state.load)
	const [restoreError, setRestoreError] = useState<string | null>(null)

	useEffect(() => {
		if (spaceStatus === 'idle') {
			void loadSpaces().catch(() => undefined)
		}
	}, [loadSpaces, spaceStatus])

	useEffect(() => {
		if (spaceStatus !== 'ready' && spaceStatus !== 'error') {
			return
		}

		let cancelled = false
		void resolveStartupPath({ spaces })
			.then((path) => {
				if (cancelled) {
					return
				}

				startTransition(() => {
					navigate(path, { replace: true })
				})
			})
			.catch((error) => {
				if (cancelled) {
					return
				}

				setRestoreError(error instanceof Error ? error.message : '恢复工作区失败')
				startTransition(() => {
					navigate('/spaces/inbox', { replace: true })
				})
			})

		return () => {
			cancelled = true
		}
	}, [navigate, spaceStatus, spaces])

	return (
		<div className='flex min-h-screen items-center justify-center bg-background px-6 text-sm text-sf-shell-tertiary'>
			{restoreError ?? spaceError ?? '正在恢复上次工作区...'}
		</div>
	)
}
