import { useEffect, useMemo, useState } from 'react'
import { zhCN } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon, CornerUpLeftIcon, CornerUpRightIcon } from 'lucide-react'

import {
	formatCustomDateInputValue,
	formatCustomDateStorageValue,
	getCustomDateDialogDescription,
	getCustomDateDialogRemoveLabel,
	getCustomDateDialogSubmitLabel,
	getCustomDateDialogTitle,
	parseCustomDateInputValue,
} from '@/features/metadata-fields/core'
import { Button } from '@/shared/ui/base/button'
import { Calendar } from '@/shared/ui/base/calendar'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/base/dialog'
import { Input } from '@/shared/ui/base/input'

type CustomDateDialogProps = {
	open: boolean
	fieldKey: 'dueDate' | 'scheduledDate' | 'reminderDate'
	label: string
	value: string | null
	hasExistingValue: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (value: string | null) => void
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

const CALENDAR_CLASS_NAMES = {
	months: 'flex w-full',
	month: 'flex w-full flex-col',
	month_caption: 'sr-only',
	caption_label: 'sr-only',
	nav: 'hidden',
	weekdays: 'mt-1 flex gap-1 border-b border-sf-border-subtle pb-1.5',
	weekday: 'flex-1 rounded-md text-center text-[11px] font-medium text-sf-text-secondary',
	week: 'mt-0.5 flex w-full gap-1',
	// 覆盖基础 day 类：用 flex-1 + aspect-square 让 7 列均分宽度并保持方形
	day: 'group/day relative flex-1 aspect-square text-center p-0 select-none',
	today:
		'rounded-full bg-sf-surface-active text-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
	outside: 'text-sf-text-quaternary opacity-70 aria-selected:text-sf-text-quaternary',
} as const

function shiftMonth(base: Date, delta: number) {
	return new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

function formatCalendarHeaderMonth(date: Date) {
	return date.toLocaleDateString('zh-CN', {
		year: 'numeric',
		month: 'long',
	})
}

export function CustomDateDialog({
	open,
	fieldKey,
	label,
	value,
	hasExistingValue,
	onOpenChange,
	onSubmit,
}: CustomDateDialogProps) {
	const [draftInput, setDraftInput] = useState('')
	const [month, setMonth] = useState(new Date())

	useEffect(() => {
		if (!open) {
			return
		}

		const parsed = value ? parseCustomDateInputValue(formatCustomDateInputValue(value)) : null
		setDraftInput(formatCustomDateInputValue(value))
		setMonth(parsed ?? new Date())
	}, [open, value])

	const parsedDate = useMemo(() => parseCustomDateInputValue(draftInput), [draftInput])
	const selectedDate = parsedDate ?? undefined
	const canSave = draftInput.trim().length > 0 && parsedDate !== null
	const nextMonth = useMemo(() => shiftMonth(month, 1), [month])
	const todayDirection = useMemo(() => {
		const now = new Date()
		const isSameMonth = (d: Date) =>
			d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
		if (isSameMonth(month) || isSameMonth(nextMonth)) return null
		// 左侧月份在今天之后 → 需要往左回去
		const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
		const nowStart = new Date(now.getFullYear(), now.getMonth(), 1)
		return monthStart > nowStart ? 'back' : 'forward'
	}, [month, nextMonth])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl border-sf-border-subtle bg-sf-surface-raised p-0 shadow-(--sf-shadow-float) sm:max-w-xl'>
				<div className='flex flex-col'>
					<div className='px-4 pt-3'>
						<DialogHeader className='gap-2 text-left'>
							<DialogTitle className='text-[17px] leading-5.5 font-semibold tracking-tight'>
								{getCustomDateDialogTitle(label)}
							</DialogTitle>
							<DialogDescription className='max-w-136 text-[13px] leading-5 text-sf-text-secondary'>
								{getCustomDateDialogDescription(label)}
							</DialogDescription>
						</DialogHeader>
						<div className='mt-3.5 flex flex-col gap-2'>
							<label
								className='text-[11px] font-medium text-sf-text-secondary'
								htmlFor={`custom-date-input-${fieldKey}`}
							>
								{label}
							</label>
							<Input
								aria-invalid={draftInput.trim().length > 0 && !parsedDate ? true : undefined}
								id={`custom-date-input-${fieldKey}`}
								inputMode='numeric'
								className='h-9 rounded-lg border-sf-border-subtle bg-sf-surface-panel px-3.5 text-[15px] tabular-nums shadow-none md:text-[15px]'
								placeholder='YYYY/MM/DD'
								value={draftInput}
								onChange={(event) => setDraftInput(event.currentTarget.value)}
							/>
						</div>
					</div>
					<div className='px-4 pb-2 pt-2'>
						<div className='flex items-start gap-8'>
							<div className='flex flex-1 flex-col'>
								<div className='ml-2 mb-2 flex h-7 w-full items-center'>
									<span className='text-[13px] font-medium text-foreground'>
										{formatCalendarHeaderMonth(month)}
									</span>
								</div>
								<Calendar
									captionLayout='label'
									className='w-full p-0'
									classNames={CALENDAR_CLASS_NAMES}
									fixedWeeks
									formatters={{
										formatWeekdayName: (date) => WEEKDAY_LABELS[date.getDay()],
									}}
									hideNavigation
									locale={zhCN}
									mode='single'
									month={month}
									numberOfMonths={1}
									onMonthChange={setMonth}
									onSelect={(date) => {
										if (!date) {
											return
										}

										setDraftInput(formatCustomDateInputValue(formatCustomDateStorageValue(date)))
										setMonth(date)
									}}
									selected={selectedDate}
								/>
							</div>
							<div className='flex flex-1 flex-col'>
								<div className='ml-2 mb-2 flex h-7 items-center justify-between'>
									<span className='text-[13px] font-medium text-foreground'>
										{formatCalendarHeaderMonth(nextMonth)}
									</span>
									<div className='flex items-center gap-1'>
										{todayDirection !== null && (
											<Button
												aria-label='跳回今天'
												className='text-sf-text-secondary'
												onClick={() => setMonth(new Date())}
												size='icon-sm'
												type='button'
												variant='ghost'
											>
												{todayDirection === 'back' ? (
													<CornerUpLeftIcon />
												) : (
													<CornerUpRightIcon />
												)}
											</Button>
										)}
										<Button
											aria-label='上一个月'
											className='text-sf-text-secondary'
											onClick={() => setMonth((current) => shiftMonth(current, -1))}
											size='icon-sm'
											type='button'
											variant='ghost'
										>
											<ChevronLeftIcon />
										</Button>
										<Button
											aria-label='下一个月'
											className='text-sf-text-secondary'
											onClick={() => setMonth((current) => shiftMonth(current, 1))}
											size='icon-sm'
											type='button'
											variant='ghost'
										>
											<ChevronRightIcon />
										</Button>
									</div>
								</div>
								<Calendar
									captionLayout='label'
									className='w-full p-0'
									classNames={CALENDAR_CLASS_NAMES}
									fixedWeeks
									formatters={{
										formatWeekdayName: (date) => WEEKDAY_LABELS[date.getDay()],
									}}
									hideNavigation
									locale={zhCN}
									mode='single'
									month={nextMonth}
									numberOfMonths={1}
									onMonthChange={(value) => setMonth(shiftMonth(value, -1))}
									onSelect={(date) => {
										if (!date) {
											return
										}

										setDraftInput(formatCustomDateInputValue(formatCustomDateStorageValue(date)))
										setMonth(date)
									}}
									selected={selectedDate}
								/>
							</div>
						</div>
					</div>
					<div className='flex items-center justify-between px-3 pb-3 pt-2'>
						<div className='min-h-7.5'>
							{hasExistingValue ? (
								<Button
									className='text-sf-text-secondary'
									onClick={() => {
										onSubmit(null)
										onOpenChange(false)
									}}
									type='button'
									variant='outline'
								>
									{getCustomDateDialogRemoveLabel(label)}
								</Button>
							) : null}
						</div>
						<div className='flex items-center justify-end gap-2'>
							<Button onClick={() => onOpenChange(false)} type='button' variant='ghost'>
								取消
							</Button>
							<Button
								disabled={!canSave}
								onClick={() => {
									if (!parsedDate) {
										return
									}
									onSubmit(formatCustomDateStorageValue(parsedDate))
									onOpenChange(false)
								}}
								type='button'
							>
								{getCustomDateDialogSubmitLabel(label)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
