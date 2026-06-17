import { startTransition, useEffect, useState } from 'react'
import { useNavigate } from '@/app/routing/tanstackCompat'

import { buildStartupFallbackPath } from '@/app/routing'
import { resolveStartupPath } from '@/app/layouts/shell/model/shellDevicePreferences'
import { useSpaces } from '@/features/space/query'

export function RootRestoreRedirect() {
	const navigate = useNavigate()
	const { spaces, status: spaceStatus, error: spaceError } = useSpaces()
	const [restoreError, setRestoreError] = useState<string | null>(null)

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
					navigate(buildStartupFallbackPath(), { replace: true })
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
