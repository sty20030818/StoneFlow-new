import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
import { Button } from '@/shared/components/base/button'
import { shellChromeNavCircleButtonClass } from '@/shared/components/patterns/shell-chrome'
import { DisabledActionTooltip } from '@/shared/components/tooltip'
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
				<CommandActionTooltip commandId={COMMAND_IDS.goBack} label='后退'>
					<Button
						aria-label='后退'
						className={shellChromeNavCircleButtonClass}
						onClick={onBack}
						size='icon-sm'
						variant='ghost'
					>
						<ChevronLeftIcon className='size-3.5' />
					</Button>
				</CommandActionTooltip>
			) : (
				<DisabledActionTooltip label='后退' reason='没有可返回的页面'>
					<Button
						aria-label='后退'
						className={shellChromeNavCircleButtonClass}
						disabled
						size='icon-sm'
						variant='ghost'
					>
						<ChevronLeftIcon className='size-3.5' />
					</Button>
				</DisabledActionTooltip>
			)}
			{canGoForward ? (
				<CommandActionTooltip commandId={COMMAND_IDS.goForward} label='前进'>
					<Button
						aria-label='前进'
						className={shellChromeNavCircleButtonClass}
						onClick={onForward}
						size='icon-sm'
						variant='ghost'
					>
						<ChevronRightIcon className='size-3.5' />
					</Button>
				</CommandActionTooltip>
			) : (
				<DisabledActionTooltip label='前进' reason='没有可前进的页面'>
					<Button
						aria-label='前进'
						className={shellChromeNavCircleButtonClass}
						disabled
						size='icon-sm'
						variant='ghost'
					>
						<ChevronRightIcon className='size-3.5' />
					</Button>
				</DisabledActionTooltip>
			)}
		</>
	)
}
