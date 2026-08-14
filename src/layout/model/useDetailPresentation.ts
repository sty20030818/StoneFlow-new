import { useLayoutEffect, useRef, useState } from 'react'

import { resolveDetailPresentation, type DetailPresentationInput } from './detailPresentation'

type UseDetailPresentationOptions = Pick<
	DetailPresentationInput,
	'detailPresentation' | 'isCompact'
>

/** 观察唯一 ShellMain panel；偏好读写仍由 settings device port 拥有。 */
export function useDetailPresentation({
	detailPresentation,
	isCompact,
}: UseDetailPresentationOptions) {
	const panelRef = useRef<HTMLDivElement>(null)
	const [panelWidth, setPanelWidth] = useState(0)

	useLayoutEffect(() => {
		const panel = panelRef.current
		if (!panel) return

		setPanelWidth(panel.getBoundingClientRect().width)
		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(([entry]) => {
			setPanelWidth(entry?.contentRect.width ?? panel.getBoundingClientRect().width)
		})
		observer.observe(panel)
		return () => observer.disconnect()
	}, [])

	const resolved = resolveDetailPresentation({ detailPresentation, panelWidth, isCompact })

	return {
		panelRef,
		panelWidth,
		...resolved,
	}
}
