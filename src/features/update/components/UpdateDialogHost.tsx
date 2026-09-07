import { lazy, Suspense, useEffect, useState } from 'react'

import { useUpdateStore } from '../model/useUpdateStore'

const LazyUpdateDialog = lazy(async () => ({
	default: (await import('./UpdateDialog')).UpdateDialog,
}))

export function UpdateDialogHost() {
	const visible = useUpdateStore((state) => state.dialogVisible)
	const [loaded, setLoaded] = useState(visible)
	useEffect(() => {
		if (visible) setLoaded(true)
	}, [visible])
	if (!visible && !loaded) return null

	return (
		<Suspense fallback={null}>
			<LazyUpdateDialog />
		</Suspense>
	)
}
