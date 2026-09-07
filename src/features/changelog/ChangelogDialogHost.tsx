import { lazy, Suspense, useEffect, useState } from 'react'

import type { ChangelogDialogProps } from './ChangelogDialog'

const LazyChangelogDialog = lazy(async () => ({
	default: (await import('./ChangelogDialog')).ChangelogDialog,
}))

export function ChangelogDialogHost(props: ChangelogDialogProps) {
	const [loaded, setLoaded] = useState(props.open)
	useEffect(() => {
		if (props.open) setLoaded(true)
	}, [props.open])
	if (!props.open && !loaded) return null

	return (
		<Suspense fallback={null}>
			<LazyChangelogDialog {...props} />
		</Suspense>
	)
}
