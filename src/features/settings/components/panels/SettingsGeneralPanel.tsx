import { useRef, useState } from 'react'
import { Alert, Button, ListBox } from '@heroui/react'
import { CellSelect, RadioButtonGroup } from '@heroui-pro/react'

import { SettingsSection, SettingsStack } from '../settingsShared'
import { ACCENT_PRESETS, readAccentPreference, setAccentPreference } from '@/features/appearance'
import { useSetDefaultSpaceMutation, useSpaces } from '@/features/space'

/**
 * 通用设置：默认空间等跨工作区偏好。
 */
export function SettingsGeneralPanel() {
	const [accent, setAccent] = useState(readAccentPreference)
	const { spaces, status: spaceStatus, error: spaceError, refetch: refetchSpaces } = useSpaces()
	const setDefaultSpace = useSetDefaultSpaceMutation()
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const pendingRef = useRef(false)
	const defaultSpace = spaces.find((space) => space.isDefault)
	const defaultSpaceId = defaultSpace?.id ?? ''

	function handleDefaultSpaceChange(nextSpaceId: string) {
		if (pendingRef.current || !nextSpaceId || nextSpaceId === defaultSpaceId) {
			return
		}

		pendingRef.current = true
		setPending(true)
		setError(null)
		void setDefaultSpace
			.mutateAsync(nextSpaceId)
			.catch((err) => {
				setError(err instanceof Error ? err.message : '设置更新失败')
			})
			.finally(() => {
				pendingRef.current = false
				setPending(false)
			})
	}

	return (
		<SettingsStack>
			<SettingsSection description='用于主要操作、链接与焦点。仅保存在这台设备上。' title='主题色'>
				<RadioButtonGroup
					aria-label='主题色'
					className='grid-cols-1 sm:grid-cols-3'
					layout='grid'
					name='appearance-accent'
					onChange={(value) => setAccent(setAccentPreference(value))}
					value={accent}
					variant='secondary'
				>
					{ACCENT_PRESETS.map((preset) => (
						<RadioButtonGroup.Item key={preset.id} value={preset.id}>
							<RadioButtonGroup.Indicator />
							<RadioButtonGroup.ItemContent>
								<span className='flex items-center gap-2'>
									<span
										aria-hidden
										className='size-4 shrink-0 rounded-full bg-accent-base'
										data-accent-preview={preset.id}
									/>
									<span className='text-sm font-medium text-foreground'>{preset.label}</span>
								</span>
							</RadioButtonGroup.ItemContent>
						</RadioButtonGroup.Item>
					))}
				</RadioButtonGroup>
			</SettingsSection>

			<SettingsSection description='全局新建或原位置不可用时，优先使用这个空间。' title='默认空间'>
				{spaceStatus === 'error' ? (
					<Alert role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>无法读取空间</Alert.Title>
							<Alert.Description>{spaceError ?? 'Space 列表加载失败。'}</Alert.Description>
						</Alert.Content>
						<Button onPress={() => void refetchSpaces()} size='sm' type='button' variant='outline'>
							重试
						</Button>
					</Alert>
				) : (
					<div aria-busy={pending} className='flex flex-col gap-3 md:max-w-md'>
						<CellSelect
							aria-label='默认空间'
							fullWidth
							isDisabled={pending || spaceStatus === 'loading' || spaces.length === 0}
							onChange={(key) => typeof key === 'string' && handleDefaultSpaceChange(key)}
							value={defaultSpaceId}
						>
							<CellSelect.Trigger>
								<CellSelect.Label>选择默认空间</CellSelect.Label>
								<CellSelect.Value />
								<CellSelect.Indicator />
							</CellSelect.Trigger>
							<CellSelect.Popover>
								<ListBox>
									{spaces.map((space) => (
										<ListBox.Item id={space.id} key={space.id} textValue={space.name}>
											{space.name}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</CellSelect.Popover>
						</CellSelect>
						{spaces.length === 0 && spaceStatus === 'ready' ? (
							<Alert>
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Title>当前没有可用空间</Alert.Title>
									<Alert.Description>创建空间后，可以在这里设置默认项。</Alert.Description>
								</Alert.Content>
							</Alert>
						) : null}
					</div>
				)}
				{error ? (
					<Alert className='mt-4' role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>设置更新失败</Alert.Title>
							<Alert.Description>{error}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}
			</SettingsSection>
		</SettingsStack>
	)
}
