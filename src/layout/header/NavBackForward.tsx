import { COMMAND_IDS, CommandTooltipRow } from '@/features/command'
import { Button, Tooltip } from '@heroui/react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

type NavBackForwardProps = {
	canGoBack: boolean
	canGoForward: boolean
	onBack: () => void
	onForward: () => void
}

export function NavBackForward({
	canGoBack,
	canGoForward,
	onBack,
	onForward,
}: NavBackForwardProps) {
	return (
		<>
			{canGoBack ? (
				<Tooltip closeDelay={0} delay={0}>
					<Button aria-label='后退' isIconOnly onPress={onBack} size='sm' variant='ghost'>
						<ChevronLeftIcon className='size-3.5' />
					</Button>
					<Tooltip.Content>
						<CommandTooltipRow commandId={COMMAND_IDS.goBack} label='后退' />
					</Tooltip.Content>
				</Tooltip>
			) : (
				<Tooltip closeDelay={0} delay={0}>
					<Tooltip.Trigger
						aria-disabled='true'
						aria-label='后退'
						className='inline-flex cursor-not-allowed'
						role='group'
						tabIndex={0}
					>
						<Button aria-label='后退' isDisabled isIconOnly size='sm' variant='ghost'>
							<ChevronLeftIcon className='size-3.5' />
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<CommandTooltipRow commandId={COMMAND_IDS.goBack} label='后退' />
						<p className='text-xs text-muted'>没有可返回的页面</p>
					</Tooltip.Content>
				</Tooltip>
			)}
			{canGoForward ? (
				<Tooltip closeDelay={0} delay={0}>
					<Button aria-label='前进' isIconOnly onPress={onForward} size='sm' variant='ghost'>
						<ChevronRightIcon className='size-3.5' />
					</Button>
					<Tooltip.Content>
						<CommandTooltipRow commandId={COMMAND_IDS.goForward} label='前进' />
					</Tooltip.Content>
				</Tooltip>
			) : (
				<Tooltip closeDelay={0} delay={0}>
					<Tooltip.Trigger
						aria-disabled='true'
						aria-label='前进'
						className='inline-flex cursor-not-allowed'
						role='group'
						tabIndex={0}
					>
						<Button aria-label='前进' isDisabled isIconOnly size='sm' variant='ghost'>
							<ChevronRightIcon className='size-3.5' />
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<CommandTooltipRow commandId={COMMAND_IDS.goForward} label='前进' />
						<p className='text-xs text-muted'>没有可前进的页面</p>
					</Tooltip.Content>
				</Tooltip>
			)}
		</>
	)
}
