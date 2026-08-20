import { useState } from 'react'
import { Alert, Button, Label, ListBox, Radio, RadioGroup, Select } from '@heroui/react'

import { SettingsSection } from '../settingsShared'
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
	const defaultSpaceId = spaces.find((space) => space.isDefault)?.id ?? ''

	function handleDefaultSpaceChange(nextSpaceId: string) {
		if (!nextSpaceId || nextSpaceId === defaultSpaceId) {
			return
		}

		setPending(true)
		setError(null)
		void setDefaultSpace
			.mutateAsync(nextSpaceId)
			.catch((err) => {
				setError(err instanceof Error ? err.message : '设置更新失败')
			})
			.finally(() => {
				setPending(false)
			})
	}

	return (
		<div className='flex w-full min-w-0 flex-col gap-4'>
			<SettingsSection
				description='选择界面的强调色。只影响主要操作、选中状态、链接与焦点，并保存在这台设备上。'
				title='主题色'
			>
				<RadioGroup
					aria-label='主题色'
					className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'
					name='appearance-accent'
					onChange={(value) => setAccent(setAccentPreference(value))}
					value={accent}
					variant='secondary'
				>
					{ACCENT_PRESETS.map((preset) => (
						<Radio data-accent-preview={preset.id} key={preset.id} value={preset.id}>
							<Radio.Content>
								<span aria-hidden className='size-3.5 shrink-0 rounded-full bg-accent-base' />
								<span className='min-w-0 flex-1 truncate'>{preset.label}</span>
								<Radio.Control>
									<Radio.Indicator />
								</Radio.Control>
							</Radio.Content>
						</Radio>
					))}
				</RadioGroup>
			</SettingsSection>

			<SettingsSection
				description='默认空间会影响全局新建和兜底恢复时的优先落点，建议把最常用的空间放在这里。'
				title='默认空间'
			>
				{spaceStatus === 'error' ? (
					<Alert role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>无法读取 Space</Alert.Title>
							<Alert.Description>{spaceError ?? 'Space 列表加载失败。'}</Alert.Description>
						</Alert.Content>
						<Button onPress={() => void refetchSpaces()} size='sm' type='button' variant='danger'>
							重试
						</Button>
					</Alert>
				) : spaces.length === 0 && spaceStatus === 'ready' ? (
					<Alert>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>当前没有可用空间</Alert.Title>
							<Alert.Description>
								当前还没有可用空间，所以暂时不能设置默认项。等空间准备好之后，再回来这里调整就可以了。
							</Alert.Description>
						</Alert.Content>
					</Alert>
				) : (
					<div className='flex flex-col gap-3 md:max-w-sm'>
						<Select
							fullWidth
							isDisabled={pending || spaceStatus === 'loading' || spaces.length === 0}
							onChange={(key) => typeof key === 'string' && handleDefaultSpaceChange(key)}
							value={defaultSpaceId}
						>
							<Label>选择默认空间</Label>
							<Select.Trigger aria-label='默认空间'>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox>
									{spaces.map((space) => (
										<ListBox.Item id={space.id} key={space.id} textValue={space.name}>
											{space.name}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</Select.Popover>
						</Select>
						<p className='text-xs leading-5 text-muted'>
							当前默认项：
							{spaces.find((space) => space.id === defaultSpaceId)?.name ?? '未设置'}
						</p>
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
		</div>
	)
}
