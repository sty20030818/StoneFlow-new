import { lazy, Suspense, useState } from 'react'

import type { ChangelogDialogProps } from './ChangelogDialog'

const LazyChangelogDialog = lazy(async () => ({
	default: (await import('./ChangelogDialog')).ChangelogDialog,
}))

export function ChangelogDialogHost(props: ChangelogDialogProps) {
	const [loaded, setLoaded] = useState(props.open)
	if (props.open && !loaded) setLoaded(true)
	if (!props.open && !loaded) return null

	return (
		<Suspense fallback={null}>
			<LazyChangelogDialog {...props} />
		</Suspense>
	)
}
