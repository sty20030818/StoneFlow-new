import { Alert, Chip } from '@heroui/react'

import { useLauncher } from '../domain/LauncherDomainProvider'

/** 连续创建提示条；挂在 Results 滚动区顶部，不撑外窗。 */
export function ContinuousToast() {
	const { derived, state } = useLauncher()

	if (!derived.continuousToastVisible) {
		return null
	}

	return (
		<Alert
			aria-live='polite'
			className='shrink-0 rounded-none border-x-0 border-t-0 px-4 py-2'
			status='success'
		>
			<Alert.Indicator />
			<Alert.Content>
				<Alert.Title className='flex items-center gap-2 text-xs'>
					<Chip color='success' size='sm' variant='soft'>
						<Chip.Label>{state.continuousCreateCount}</Chip.Label>
					</Chip>
					<span>已连续创建 {state.continuousCreateCount} 条</span>
				</Alert.Title>
			</Alert.Content>
		</Alert>
	)
}
