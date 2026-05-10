import { CheckIcon, ChevronDownIcon, FolderIcon, SearchIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/base/popover'

const PRIORITY_OPTIONS = [
	{ value: 0, code: '—', label: '无优先级' },
	{ value: 4, code: 'P0', label: '紧急' },
	{ value: 3, code: 'P1', label: '高优先级' },
	{ value: 2, code: 'P2', label: '中优先级' },
	{ value: 1, code: 'P3', label: '低优先级' },
] as const

export function QuickCreateInputRow() {
	const { actions, derived, refs, state } = useQuickCreate()
	const currentPriority = PRIORITY_OPTIONS.find((option) => option.value === state.draft.priority) ?? PRIORITY_OPTIONS[0]

	return (
		<div className='flex items-center gap-2 px-3 py-3'>
			<Popover
				open={state.activePopover === 'priority'}
				onOpenChange={(open) => actions.setPopover(open ? 'priority' : null)}
			>
				<PopoverTrigger asChild>
					<Button
						aria-label='优先级'
						className={cn(
							'h-8 min-w-13 rounded-lg px-3 font-mono text-[11px] font-semibold',
							state.draft.priority === 0
								? 'border-sf-border-subtle text-sf-text-quaternary'
								: 'border-sf-border-interactive text-sf-text-interactive',
						)}
						size='sm'
						variant='outline'
					>
						{currentPriority.code}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-46 rounded-xl p-1.5' align='start'>
					<div className='px-2 py-1 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
						优先级
					</div>
					<div className='space-y-0.5'>
						{PRIORITY_OPTIONS.map((option) => (
							<button
								className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] text-foreground hover:bg-accent'
								key={option.value}
								onClick={() => actions.setPriority(option.value)}
								type='button'
							>
								<span className='flex w-4 justify-center text-primary'>
									{option.value === state.draft.priority ? <CheckIcon className='size-3.5' /> : null}
								</span>
								<span className='w-7 rounded bg-muted px-1.5 py-0.5 text-center font-mono text-[10.5px] font-semibold text-sf-text-secondary'>
									{option.code}
								</span>
								<span>{option.label}</span>
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>

			<input
				ref={refs.titleInputRef}
				aria-label='Quick Create 输入'
				autoComplete='off'
				className='h-8 min-w-0 flex-1 rounded-lg border border-sf-border-subtle bg-background px-3 text-[13.5px] text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/15 placeholder:text-sf-text-quaternary'
				disabled={state.submitState === 'submitting'}
				onChange={(event) => actions.setTitle(event.currentTarget.value)}
				onKeyDown={actions.handleInputKeyDown}
				placeholder='写下任务…'
				spellCheck={false}
				value={state.draft.title}
			/>

			<Popover
				open={state.activePopover === 'project'}
				onOpenChange={(open) => actions.setPopover(open ? 'project' : null)}
			>
				<PopoverTrigger asChild>
					<Button
						aria-label='项目选择'
						className='h-8 max-w-44 rounded-lg px-3'
						size='sm'
						variant='outline'
					>
						<FolderIcon className='size-3.5 text-sf-text-secondary' />
						<span className='truncate text-[12px]'>{derived.placementLabel}</span>
						<ChevronDownIcon className='size-3.5 text-sf-text-quaternary' />
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-60 rounded-xl p-1.5' align='end'>
					<div className='px-2 py-1 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
						项目
					</div>
					<div className='mb-1 flex items-center gap-2 rounded-lg border border-sf-border-subtle px-2 py-1.5'>
						<SearchIcon className='size-3.5 text-sf-text-quaternary' />
						<input
							ref={refs.projectSearchRef}
							aria-label='搜索项目'
							className='min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-sf-text-quaternary'
							onChange={(event) => actions.setProjectSearch(event.currentTarget.value)}
							placeholder='搜索项目…'
							value={state.projectSearch}
						/>
					</div>
					<div className='max-h-64 space-y-0.5 overflow-y-auto pr-0.5'>
						{derived.projectOptions.map((option) => {
							const isSelected =
								option.kind === state.draft.placement.kind &&
								(option.kind !== 'project' || option.id === state.draft.placement.projectId)

							return (
								<button
									className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] text-foreground hover:bg-accent'
									key={`${option.kind}-${option.id ?? option.spaceId}`}
									onClick={() =>
										actions.selectPlacement(
											option.kind === 'project'
												? { kind: 'project', projectId: option.id }
												: option.kind === 'noProject'
													? { kind: 'noProject', projectId: null }
													: { kind: 'inbox', projectId: null },
										)
									}
									type='button'
								>
									<span className='flex w-4 justify-center text-primary'>
										{isSelected ? <CheckIcon className='size-3.5' /> : null}
									</span>
									<FolderIcon className='size-3.5 text-sf-text-secondary' />
									<span className='truncate'>{option.name}</span>
								</button>
							)
						})}
						{derived.projectOptions.length === 0 ? (
							<div className='px-2 py-3 text-[12px] text-sf-text-quaternary'>没有匹配的项目</div>
						) : null}
					</div>
				</PopoverContent>
			</Popover>

			<Button
				aria-label='更多参数'
				className={cn(
					'h-8 w-8 rounded-lg p-0',
					state.isAdvancedOpen ? 'border-primary text-primary' : 'text-sf-text-quaternary',
				)}
				onClick={actions.toggleAdvanced}
				size='icon-sm'
				variant='outline'
			>
				<ChevronDownIcon className={cn('size-4 transition-transform', state.isAdvancedOpen ? 'rotate-180' : '')} />
			</Button>
		</div>
	)
}
