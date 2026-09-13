import { useLayoutEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { useTaskBoardSticky } from './useTaskBoardSticky'

const ITEM_SIZE = 44
const SECOND_GROUP_INDEX = 21
const SECOND_GROUP_TOP = SECOND_GROUP_INDEX * ITEM_SIZE
const STICKY_INDEXES = [0, SECOND_GROUP_INDEX]
const ITEM_OFFSETS = Array.from({ length: 42 }, (_, index) => index * ITEM_SIZE)
const GROUP_LABELS = new Map([
	[0, '无优先级 › 等待中'],
	[SECOND_GROUP_INDEX, '无优先级 › 已取消'],
])

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300)
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(960)
})

afterEach(() => {
	vi.useRealTimers()
})

it('真实虚拟窗口已提交新组时，即使 scroll RAF 尚未执行，sticky 也必须更新', () => {
	render(<VirtualStickyFixture />)
	expect(screen.getByTestId('sticky')).toHaveTextContent('无优先级 › 等待中')

	const viewport = screen.getByTestId('viewport')
	viewport.scrollTop = SECOND_GROUP_TOP + ITEM_SIZE * 10
	fireEvent.scroll(viewport)

	// TanStack 的 scroll onChange 已同步提交新的虚拟行，不能等另一个帧才换标题。
	expect(screen.getByText('任务 31')).toBeInTheDocument()
	expect(screen.queryByText('任务 1')).not.toBeInTheDocument()
	expect(screen.getByTestId('sticky')).toHaveTextContent('无优先级 › 已取消')
})

it('同组滚动更新 push，跨组提交前保留旧标题偏移，提交后再清零', () => {
	const commits: Array<{ label: string; transform: string }> = []
	render(<VirtualStickyFixture onCommit={(value) => commits.push(value)} />)
	const viewport = screen.getByTestId('viewport')
	viewport.scrollTop = SECOND_GROUP_TOP - 20
	fireEvent.scroll(viewport)
	act(() => vi.advanceTimersToNextFrame())
	expect(screen.getByTestId('sticky-push')).toHaveStyle({ transform: 'translate3d(0, -18px, 0)' })

	commits.length = 0
	viewport.scrollTop = SECOND_GROUP_TOP + 6
	fireEvent.scroll(viewport)
	expect(screen.getByTestId('sticky')).toHaveTextContent('无优先级 › 已取消')
	expect(screen.getByTestId('sticky-push')).toHaveStyle({ transform: 'translate3d(0, 0px, 0)' })
	expect(commits).not.toContainEqual({
		label: '无优先级 › 等待中',
		transform: 'translate3d(0, 0px, 0)',
	})
	act(() => vi.advanceTimersToNextFrame())
	expect(screen.getByTestId('sticky')).toHaveTextContent('无优先级 › 已取消')
})

function VirtualStickyFixture({
	onCommit,
}: {
	onCommit?: (value: { label: string; transform: string }) => void
}) {
	const [viewport, setViewport] = useState<HTMLDivElement | null>(null)
	const sticky = useTaskBoardSticky({
		scrollViewport: viewport,
		stickyIndexes: STICKY_INDEXES,
		itemOffsets: ITEM_OFFSETS,
		enabled: true,
	})
	// eslint-disable-next-line react/incompatible-library -- 夹具直接读取真实虚拟窗口，不将可变 API 传入 memo 消费者。
	const virtualizer = useVirtualizer({
		count: ITEM_OFFSETS.length,
		getScrollElement: () => viewport,
		estimateSize: () => ITEM_SIZE,
		initialRect: { width: 960, height: 300 },
		overscan: 0,
	})
	const label = GROUP_LABELS.get(sticky.stickyActiveIndex) ?? ''
	useLayoutEffect(() => {
		onCommit?.({ label, transform: sticky.stickyPushLayerRef.current?.style.transform ?? '' })
	})
	return (
		<div data-testid='viewport' ref={setViewport} style={{ height: 300, overflowY: 'auto' }}>
			<div data-testid='sticky' ref={sticky.stickyShellRef}>
				<div data-testid='sticky-push' ref={sticky.stickyPushLayerRef}>
					{label}
				</div>
			</div>
			<div style={{ height: virtualizer.getTotalSize() }}>
				{virtualizer.getVirtualItems().map((item) => (
					<div key={item.key}>任务 {item.index}</div>
				))}
			</div>
		</div>
	)
}
