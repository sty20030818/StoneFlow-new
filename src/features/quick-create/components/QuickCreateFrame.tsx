import type { PointerEvent } from 'react'

import { QuickCreatePanel } from '@/features/quick-create/components/QuickCreatePanel'

type QuickCreateFrameProps = {
	isVisible: boolean
	onRequestClose: () => void
}

/**
 * 透明点击层：点面板外关闭；面板本体由固定壳 Panel 填充窗口。
 */
export function QuickCreateFrame({ isVisible, onRequestClose }: QuickCreateFrameProps) {
	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!isVisible || event.target !== event.currentTarget) {
			return
		}
		onRequestClose()
	}

	return (
		<div className='relative flex h-full min-h-0 w-full bg-transparent' onPointerDown={handlePointerDown}>
			<QuickCreatePanel isVisible={isVisible} />
		</div>
	)
}
