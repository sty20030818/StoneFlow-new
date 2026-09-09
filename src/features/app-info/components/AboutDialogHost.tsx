import { lazy, Suspense, useState } from 'react'

import type { AboutDialogProps } from './AboutDialog'

const LazyAboutDialog = lazy(async () => ({
	default: (await import('./AboutDialog')).AboutDialog,
}))

export function AboutDialogHost(props: AboutDialogProps) {
	const [loaded, setLoaded] = useState(props.open)
	if (props.open && !loaded) setLoaded(true)
	if (!props.open && !loaded) return null

	return (
		<Suspense fallback={null}>
			<LazyAboutDialog {...props} />
		</Suspense>
	)
}
