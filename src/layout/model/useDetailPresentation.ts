import { useLayoutEffect, useState } from 'react'

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
	const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null)
	const [panelWidth, setPanelWidth] = useState(0)

	useLayoutEffect(() => {
		if (!panelElement) return

		setPanelWidth(panelElement.getBoundingClientRect().width)
		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(([entry]) => {
			setPanelWidth(entry?.contentRect.width ?? panelElement.getBoundingClientRect().width)
		})
		observer.observe(panelElement)
		return () => observer.disconnect()
	}, [panelElement])

	const resolved = resolveDetailPresentation({ detailPresentation, panelWidth, isCompact })

	return {
		panelElement,
		panelRef: setPanelElement,
		panelWidth,
		...resolved,
	}
}
