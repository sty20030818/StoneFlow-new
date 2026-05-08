import { Button } from '@/shared/ui/base/button'
import { shellChromeNavCircleButtonClass } from '@/shared/ui/patterns/shell-chrome'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

type NavBackForwardProps = {
	canGoBack: boolean
	canGoForward: boolean
	onBack: () => void
	onForward: () => void
}

export function NavBackForward({ canGoBack, canGoForward, onBack, onForward }: NavBackForwardProps) {
	return (
		<>
			<Button
				aria-label='后退'
				className={shellChromeNavCircleButtonClass}
				disabled={!canGoBack}
				onClick={onBack}
				size='icon-sm'
				variant='ghost'
			>
				<ChevronLeftIcon className='size-3.5' />
			</Button>
			<Button
				aria-label='前进'
				className={shellChromeNavCircleButtonClass}
				disabled={!canGoForward}
				onClick={onForward}
				size='icon-sm'
				variant='ghost'
			>
				<ChevronRightIcon className='size-3.5' />
			</Button>
		</>
	)
}
