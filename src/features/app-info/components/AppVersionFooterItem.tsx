import { Chip } from '@heroui/react'

import { ActionTooltip } from '@/shared/components/tooltip'

import { useAppVersion } from '../hooks/useAppVersion'

/** Footer 右侧的运行中应用版本号。 */
export function AppVersionFooterItem() {
	const { version } = useAppVersion()
	if (!version) return null
	const label = `版本 ${version}`

	return (
		<ActionTooltip label={label}>
			<Chip aria-label={label} className='shrink-0' size='sm' tabIndex={0} variant='tertiary'>
				<Chip.Label>v{version}</Chip.Label>
			</Chip>
		</ActionTooltip>
	)
}
