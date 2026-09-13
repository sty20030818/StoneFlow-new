import { useRef, type ReactNode, type Ref } from 'react'

import { checkboxVariants, Dropdown } from '@heroui/react'

import { OverflowTooltip } from '@/shared/components/tooltip'

type FilterValueOptionProps = {
	ref?: Ref<HTMLDivElement>
	value: string
	label: string
	leading?: ReactNode
	count?: number
	disabled?: boolean
	onClose?: () => void
	onToggle?: () => void
}

const checkboxStyles = checkboxVariants({ variant: 'primary' })

/** 复用 Labels 的展示勾选框；选择语义与焦点仍只由菜单项持有。 */
export function FilterValueOption({
	ref,
	value,
	label,
	leading,
	count,
	disabled,
	onClose,
	onToggle,
}: FilterValueOptionProps) {
	const keepOpenAfterSelectionRef = useRef(false)

	return (
		<Dropdown.Item
			ref={ref}
			aria-label={label}
			id={value}
			isDisabled={disabled}
			onAction={() => {
				const keepOpen = keepOpenAfterSelectionRef.current
				keepOpenAfterSelectionRef.current = false
				onToggle?.()
				if (!keepOpen) onClose?.()
			}}
			onPressStart={(event) => {
				if (event.pointerType === 'keyboard' || event.pointerType === 'virtual') {
					keepOpenAfterSelectionRef.current = false
				}
			}}
			onPointerCancel={() => {
				keepOpenAfterSelectionRef.current = false
			}}
			onPointerDown={(event) => {
				keepOpenAfterSelectionRef.current =
					event.target instanceof Element && event.target.closest('[data-slot="checkbox"]') !== null
			}}
			shouldCloseOnSelect={false}
			textValue={label}
		>
			{({ isSelected }) => (
				<span className='flex min-w-0 flex-1 items-center gap-2'>
					<span
						aria-hidden
						className={checkboxStyles.base()}
						data-selected={isSelected || undefined}
						data-slot='checkbox'
					>
						<span className={checkboxStyles.control()} data-slot='checkbox-control'>
							<span className={checkboxStyles.indicator()} data-slot='checkbox-indicator'>
								<svg
									aria-hidden='true'
									data-slot='checkbox-default-indicator--checkmark'
									fill='none'
									role='presentation'
									stroke='currentColor'
									strokeDasharray={22}
									strokeDashoffset={isSelected ? 44 : 66}
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									viewBox='0 0 17 18'
								>
									<polyline points='1 9 7 14 15 4' />
								</svg>
							</span>
						</span>
					</span>
					{leading ? (
						<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
							{leading}
						</span>
					) : null}
					<OverflowTooltip className='min-w-0 flex-1' content={label}>
						{label}
					</OverflowTooltip>
					{count == null ? null : (
						<span className='shrink-0 text-[12px] tabular-nums text-muted'>{count}</span>
					)}
				</span>
			)}
		</Dropdown.Item>
	)
}
