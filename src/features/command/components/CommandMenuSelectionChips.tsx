// CommandMenu 顶部选中对象摘要 Chips 展示与自适应截断。

import { useLayoutEffect, useRef, useState } from 'react'

import { Chip } from '@heroui/react'

import { cn } from '@/shared/lib/utils'
import type { CommandSelectedEntity } from '@/features/command/core'

export const COMMAND_SELECTION_CHIP_GAP_PX = 6

export function CommandMenuSelectionChips({ entities }: { entities: CommandSelectedEntity[] }) {
	// hooks 必须在任何 early return 之前，避免空选中 ↔ 有选中时 Hook 顺序变化
	const containerRef = useRef<HTMLDivElement>(null)
	const measureRef = useRef<HTMLDivElement>(null)
	const [visibleCount, setVisibleCount] = useState(entities.length)

	useLayoutEffect(() => {
		if (entities.length === 0) {
			return
		}

		const container = containerRef.current
		const measure = measureRef.current
		if (!container || !measure) {
			return
		}

		const recalculate = () => {
			const nextVisibleCount = calculateVisibleSelectionChipCount({
				container,
				entityCount: entities.length,
				measure,
			})

			setVisibleCount((current) => (current === nextVisibleCount ? current : nextVisibleCount))
		}

		recalculate()

		if (typeof ResizeObserver === 'undefined') {
			return
		}

		const observer = new ResizeObserver(recalculate)
		observer.observe(container)

		return () => {
			observer.disconnect()
		}
	}, [entities])

	if (entities.length === 0) {
		return null
	}

	const visibleEntities = entities.slice(0, visibleCount)
	const hiddenCount = entities.length - visibleEntities.length

	return (
		<>
			<div
				aria-label='当前选中对象'
				className='flex items-center gap-1.5 overflow-hidden px-2 pt-2'
				ref={containerRef}
			>
				{visibleEntities.map((entity) => (
					<ReadonlySelectionSummaryChip
						key={`${entity.type}:${entity.id}`}
						label={formatCommandSelectionSummaryLabel(entity)}
					/>
				))}
				{hiddenCount > 0 ? (
					<ReadonlySelectionSummaryChip label={`+${hiddenCount}`} tabular />
				) : null}
			</div>
			<div
				aria-hidden='true'
				className='pointer-events-none fixed top-0 left-0 -z-10 flex h-0 overflow-hidden opacity-0'
				ref={measureRef}
			>
				{entities.map((entity) => (
					<ReadonlySelectionSummaryChip
						data-selection-chip=''
						key={`measure-${entity.type}:${entity.id}`}
						label={formatCommandSelectionSummaryLabel(entity)}
					/>
				))}
				{Array.from({ length: entities.length }, (_, index) => index + 1).map((count) => (
					<ReadonlySelectionSummaryChip
						data-hidden-count={count}
						data-selection-overflow=''
						key={`measure-hidden-${count}`}
						label={`+${count}`}
						tabular
					/>
				))}
			</div>
		</>
	)
}

function ReadonlySelectionSummaryChip({
	label,
	tabular = false,
	className,
	...props
}: Omit<React.ComponentProps<'span'>, 'color'> & {
	label: string
	tabular?: boolean
}) {
	return (
		<Chip
			{...props}
			aria-hidden='true'
			className={cn(
				'pointer-events-none max-w-56 shrink-0 cursor-default overflow-hidden',
				tabular && 'tabular-nums',
				className,
			)}
			size='sm'
			variant='secondary'
		>
			<Chip.Label className='truncate'>{label}</Chip.Label>
		</Chip>
	)
}

export function formatCommandSelectionSummaryLabel(entity: CommandSelectedEntity) {
	return entity.subtitle ? `${entity.title} · ${entity.subtitle}` : entity.title
}

export function calculateVisibleSelectionChipCount({
	container,
	entityCount,
	measure,
}: {
	container: HTMLDivElement
	entityCount: number
	measure: HTMLDivElement
}) {
	if (entityCount === 0) {
		return 0
	}

	const availableWidth = container.clientWidth
	if (availableWidth <= 0) {
		return entityCount
	}

	const chipWidths = Array.from(measure.querySelectorAll<HTMLElement>('[data-selection-chip]')).map(
		(node) => node.getBoundingClientRect().width,
	)
	const overflowWidths = new Map(
		Array.from(measure.querySelectorAll<HTMLElement>('[data-selection-overflow]')).map((node) => [
			Number(node.dataset.hiddenCount ?? '0'),
			node.getBoundingClientRect().width,
		]),
	)

	let usedWidth = 0
	let visibleCount = 0

	for (let index = 0; index < entityCount; index += 1) {
		const chipWidth = chipWidths[index] ?? 0
		const nextUsedWidth =
			usedWidth + (visibleCount > 0 ? COMMAND_SELECTION_CHIP_GAP_PX : 0) + chipWidth
		const hiddenCount = entityCount - (index + 1)
		const requiredWidth =
			hiddenCount > 0
				? nextUsedWidth + COMMAND_SELECTION_CHIP_GAP_PX + (overflowWidths.get(hiddenCount) ?? 0)
				: nextUsedWidth

		if (requiredWidth > availableWidth) {
			break
		}

		usedWidth = nextUsedWidth
		visibleCount = index + 1
	}

	if (visibleCount > 0 || entityCount === 1) {
		return Math.max(visibleCount, 1)
	}

	const overflowOnlyWidth = overflowWidths.get(entityCount) ?? 0
	return overflowOnlyWidth <= availableWidth ? 0 : 1
}
